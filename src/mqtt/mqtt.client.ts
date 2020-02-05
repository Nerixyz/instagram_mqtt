import { Observable, Subject } from 'rxjs';
import {
    ExecuteDelayed,
    ExecuteNextTick,
    ExecutePeriodically,
    ListenOptions,
    MqttClientConstructorOptions,
    MqttSubscription,
    RegisterClientOptions,
    StopExecuting,
} from './mqtt.types';
import {
    IncomingPublishFlow,
    OutgoingConnectFlow,
    OutgoingDisconnectFlow,
    OutgoingPingFlow,
    OutgoingPublishFlow,
    OutgoingSubscribeFlow,
    OutgoingUnsubscribeFlow,
    PacketFlow,
} from './flow';
import { MqttParser } from './mqtt.parser';
import { TlsTransport, Transport } from './transport';
import { MqttPacket } from './mqtt.packet';
import { pull, defaults } from 'lodash';
import { PacketStream } from './packet-stream';
import { PacketTypes } from './mqtt.constants';
import { ConnectRequestOptions, ConnectResponsePacket, PublishRequestPacket } from './packets';
import { MqttMessage } from './mqtt.message';
import { filter, map } from 'rxjs/operators';
import debug = require('debug');

export class MqttClient {
    private mqttDebug = debug('mqtt:client');
    // wrapper functions
    protected executeNextTick: ExecuteNextTick;
    protected executePeriodically: ExecutePeriodically;
    protected stopExecuting: StopExecuting;
    protected executeDelayed: ExecuteDelayed;

    /**
     * An error has been encountered, the client will no longer work correctly
     * @type {Subject<Error>}
     */
    $error = new Subject<Error>();
    /**
     * An error has been encountered, the client might still continue to work
     * @type {Subject<Error>}
     */
    $warning = new Subject<Error>();
    /**
     *
     * @type {Subject<void>}
     */
    $open = new Subject<void>();
    /**
     * The client successfully established a connection
     * @type {Subject<void>}
     */
    $connect = new Subject<ConnectResponsePacket>();
    /**
     * The client disconnected.
     * @type {Subject<void>}
     */
    $disconnect = new Subject<void>();
    $message = new Subject<MqttMessage>();

    get keepAlive(): number {
        return this.state?.connectOptions?.keepAlive ?? 0;
    }

    set keepAlive(value) {
        if (this.state?.connectOptions) {
            this.state.connectOptions.keepAlive = value;
            if (value) {
                this.updateKeepAlive(value);
            }
        }
    }

    protected transport: Transport<unknown>;
    protected parser: MqttParser;

    protected connectTimer: object;
    protected keepAliveTimer?: object;

    protected state: MqttClientState;
    protected activeFlows: PacketFlow<any>[] = [];

    constructor(options: MqttClientConstructorOptions) {
        this.state = {
            connected: false,
            connecting: false,
            disconnected: false,
        };
        this.parser = options.parser ?? new MqttParser(e => this.$error.next(e));
        this.transport =
            options.transport ??
            new TlsTransport({
                url: options.url,
                enableTrace: options.enableTrace ?? false,
            });

        try {
            this.executeNextTick = process.nextTick;
            this.executePeriodically = (ms, cb) => setInterval(cb, ms);
            this.executeDelayed = (ms, cb) => setTimeout(cb, ms);
            this.stopExecuting = clearInterval;
        } catch (e) {
            this.mqttDebug(`Could not register timers: ${e.stack}`);
        }
    }

    public connect(options: RegisterClientOptions) {
        if (this.state.connected || this.state.connecting) {
            throw new Error('Invalid State: The client is already connecting/connected!');
        }
        this.state.connectOptions = defaults(options, this.state.connectOptions ?? {});
        this.transport.callbacks = {
            disconnect: (data?: Error) => {
                if (data) {
                    this.mqttDebug(`Transport disconnected with ${data}\n${data.stack}`);
                    this.$error.next(data);
                }
                this.setDisconnected();
            },
            connect: () => this.$open.next(),
            error: (e: Error) => this.$error.next(e),
            data: (data: Buffer) => this.parseData(data),
        };
        this.setConnecting();
        this.transport.connect();
        return this.registerClient(options);
    }

    protected registerClient(options: RegisterClientOptions, noNewPromise = false): Promise<any> {
        let promise;
        if (noNewPromise) {
            promise = this.startFlow(this.getConnectFlow(options));
        } else {
            promise = new Promise<void>(resolve => {
                this.state.startResolve = resolve;
            });
            this.startFlow(this.getConnectFlow(options)).then(() => this.state.startResolve?.());
        }
        this.connectTimer = this.executeDelayed(2000, () => {
            this.registerClient(options, true).then(() => this.state.startResolve?.());
        });
        return promise;
    }

    protected getConnectFlow(options: any): PacketFlow<any> {
        return new OutgoingConnectFlow(options);
    }

    public publish(message: MqttMessage): Promise<MqttMessage> {
        return this.startFlow(new OutgoingPublishFlow(message));
    }

    public subscribe(subscription: MqttSubscription): Promise<MqttSubscription> {
        return this.startFlow(new OutgoingSubscribeFlow(subscription));
    }

    public unsubscribe(subscription: MqttSubscription): Promise<MqttSubscription> {
        return this.startFlow(new OutgoingUnsubscribeFlow(subscription));
    }

    public disconnect(): Promise<ConnectRequestOptions> {
        return this.startFlow(new OutgoingDisconnectFlow(this.state.connectOptions ?? {}));
    }

    public listen<T>(listener: ListenOptions<T>): Observable<T> {
        // @ts-ignore
        return this.$message
            .pipe(
                filter(v => {
                    if (v.topic !== listener.topic) return false;
                    if (typeof listener.validator === null) return true;
                    if (!listener.validator) {
                        return v.payload && v.payload.length > 0;
                    }
                    return listener.validator(v);
                }),
            )
            .pipe(map(v => (listener.transformer ?? (x => x))(v)));
    }

    protected startFlow<T>(flow: PacketFlow<T>): Promise<T> {
        const first = flow.start();
        if (first) this.sendPacket(first);

        if (!flow.finished) {
            this.activeFlows.push(flow);
        }
        return flow.promise;
    }

    /**
     *
     * @param {MqttPacket} packet
     * @returns {boolean} true if a flow has been found
     */
    protected continueFlows(packet: MqttPacket): boolean {
        let result = false;
        for (const flow of this.activeFlows) {
            if (flow.accept(packet)) {
                const next = flow.next(packet);
                if (next) {
                    this.sendPacket(next);
                }
                result = true;
            }
        }
        this.checkFlows();
        return result;
    }

    protected checkFlows() {
        this.activeFlows = pull(this.activeFlows, ...this.activeFlows.filter(f => f.finished));
    }

    protected updateKeepAlive(value: number) {
        value = Math.max(value - 0.5, 1);
        if (this.keepAliveTimer) {
            this.stopExecuting(this.keepAliveTimer);
        }
        this.mqttDebug(`Starting keep-alive-ping {delay: ${value}}`);
        this.keepAliveTimer = this.executePeriodically(value * 1000, () => {
            const pingDebug = this.mqttDebug.extend('ping');
            this.startFlow(new OutgoingPingFlow())
                .then(() => pingDebug(`PingPong @ ${Date.now()}`))
                .catch(() => pingDebug('PingPong failed.'));
        });
    }

    protected sendPacket(packet: MqttPacket) {
        const stream = PacketStream.empty();
        packet.write(stream);
        this.transport.send(stream.data);
    }

    protected async parseData(data: Buffer): Promise<void> {
        try {
            const results = await this.parser.parse(data);
            if (results.length > 0) {
                results.forEach(r => this.handlePacket(r));
            }
        } catch (e) {
            this.$warning.next(e);
        }
    }

    protected async handlePacket(packet: MqttPacket): Promise<void> {
        switch (packet.packetType) {
            case PacketTypes.TYPE_PUBLISH: {
                const pub = packet as PublishRequestPacket;
                this.startFlow(
                    new IncomingPublishFlow(
                        {
                            topic: pub.topic,
                            payload: pub.payload,
                            qosLevel: pub.qosLevel,
                            retained: pub.retained,
                            duplicate: pub.duplicate,
                        },
                        pub.identifier,
                    ),
                )
                    .then(m => this.$message.next(m))
                    .catch(e => console.error(e, e.stack));
                break;
            }
            case PacketTypes.TYPE_CONNACK: {
                this.setConnected();
                this.$connect.next(packet as ConnectResponsePacket);
                if (this.state?.connectOptions?.keepAlive) {
                    this.updateKeepAlive(this.state.connectOptions.keepAlive);
                }
                // no break - continue
            }
            /* eslint no-fallthrough: "off" */
            case PacketTypes.TYPE_PINGRESP:
            case PacketTypes.TYPE_SUBACK:
            case PacketTypes.TYPE_UNSUBACK:
            case PacketTypes.TYPE_PUBREL:
            case PacketTypes.TYPE_PUBACK:
            case PacketTypes.TYPE_PUBREC:
            case PacketTypes.TYPE_PUBCOMP: {
                if (!this.continueFlows(packet)) {
                    this.$warning.next(new Error(`Unexpected packet: ${Object.keys(PacketTypes)[packet.packetType]}`));
                }
                break;
            }
            case PacketTypes.TYPE_DISCONNECT: {
                // ? this.disconnect();
                this.setDisconnected();
                break;
            }
            default: {
                this.$warning.next(
                    new Error(`Cannot handle packet of type ${Object.keys(PacketTypes)[packet.packetType]}`),
                );
            }
        }
    }

    protected setConnecting() {
        this.state.connecting = true;
        this.state.connected = false;
        this.state.disconnected = false;
    }

    protected setConnected() {
        this.state.connecting = false;
        this.state.connected = true;
        this.state.disconnected = false;
        this.stopExecuting(this.connectTimer);
    }

    protected setDisconnected() {
        this.$disconnect.next();
        this.state.connecting = false;
        this.state.connected = false;
        this.state.disconnected = true;
        this.stopExecuting(this.keepAliveTimer);
    }
}

export interface MqttClientState {
    connected: boolean;
    connecting: boolean;
    disconnected: boolean;
    connectOptions?: RegisterClientOptions;
    startResolve?: () => void;
}
