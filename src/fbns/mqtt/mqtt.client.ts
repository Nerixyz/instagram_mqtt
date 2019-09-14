import {
    ExecuteDelayed,
    ExecuteNextTick,
    ExecutePeriodically,
    MqttClientConstructorOptions,
    MqttSubscription,
    RegisterClientOptions, StopExecuting
} from "./mqtt.types";
import * as URL from 'url';
import Bluebird = require("bluebird");
import {EventEmitter} from "events";
import {MqttParser} from "./mqtt.parser";
import {PacketFlow} from "./flow/packet-flow";
import {MqttPacket} from "./mqtt.packet";
import {PacketStream} from "./packet-stream";
import {PacketTypes} from "./mqtt.constants";
import {PublishRequestPacket} from "./packets/publish.request.packet";
import {IncomingPublishFlow} from "./flow/incoming.publish.flow";
import {PublishReceivedPacket} from "./packets/publish.received.packet";
import {OutgoingConnectFlow} from "./flow/outgoing.connect.flow";
import {OutgoingPublishFlow} from "./flow/outgoing.publish.flow";
import {OutgoingSubscribeFlow} from "./flow/outgoing.subscribe.flow";
import {OutgoingUnsubscribeFlow} from "./flow/outgoing.unsubscribe.flow";
import {OutgoingDisconnectFlow} from "./flow/outgoing.disconnect.flow";
import {OutgoingPingFlow} from "./flow/outgoing.ping.flow";
import {MqttMessage} from "./mqtt.message";
import {ConnectRequestPacket} from "./packets/connect.request.packet";
import { Writable } from "stream";
import { connect, TLSSocket } from "tls";

export class MqttClient extends EventEmitter {

    public executeNextTick: ExecuteNextTick;
    public executePeriodically: ExecutePeriodically;
    public stopExecuting: StopExecuting;
    public executeDelayed: ExecuteDelayed;

    public parser: MqttParser;
    public socket: TLSSocket;
    protected isConnected: boolean = false;
    protected isConnecting: boolean = false;
    protected isDisconnected: boolean = false;
    protected url: URL.UrlWithStringQuery;

    protected receivingFlows: PacketFlow<any>[] = [];
    protected sendingFlows: PacketFlow<any>[] = [];
    protected writtenFlow: PacketFlow<any>;

    protected connectionSettings: RegisterClientOptions;

    protected timers: any[] = [];
    protected connectTimer: any;

    constructor(options: MqttClientConstructorOptions) {
        super();
        this.url = URL.parse(options.url);
        this.parser = options.parser || new MqttParser(this.emitError);

        try {
            this.executeNextTick = process.nextTick;
            this.executePeriodically = (ms, cb) => setInterval(cb, ms);
            this.executeDelayed = (ms, cb) => setTimeout(cb, ms);
            this.stopExecuting = clearInterval;
        } catch (e) {
            // process isn't defined
        }
    }

    public connect(options: RegisterClientOptions) {
        this.connectionSettings = options;
        if (this.isConnected || this.isConnecting) {
            throw new Error('This client is already in use.');
        }
        this.socket = connect({
            host: this.url.hostname,
            port: Number(this.url.port),
            enableTrace: true,
        });
        this.socket.setEncoding('utf8');
        this.setupListeners({registerOptions: options});
        this.setConnecting();
    }

    protected emitError: (e) => void = (e) => this.emit('error', e);
    protected emitWarning: (e) => void = (e) => this.emit('warning', e);
    protected emitOpen: () => void = () => this.emit('open');

    protected emitFlow: (name: string, result: any) => void = (name, result) => this.emit(name, result);

    protected setupListeners(options: { registerOptions: RegisterClientOptions }) {
        this.socket.on('error', (e) => {
            if (this.isConnecting) {
                this.setDisconnected();
            }
            this.emitError(e);
        });
        this.socket.on('end', () => this.emit('end'));
        this.socket.on('close', () => {
            this.setDisconnected();
        });
        this.socket.on('OCSPResponse', (buf) => {
            console.log('ocsp');
        });
        this.socket.on('secureConnect', () => {
            this.emitOpen();
            this.registerClient(this.connectionSettings);
        });
        this.socket.on('timeout', () => {
            this.setDisconnected();
            this.emitError(new Error('Timed out'));
        });

        this.socket.on('data', (buf) => this.handleData(buf));
    }

    public publish(message: MqttMessage) {
        this.startFlow(new OutgoingPublishFlow(message));
    }

    public subscribe(subscription: MqttSubscription) {
        this.startFlow(new OutgoingSubscribeFlow(subscription));
    }

    public unsubscribe(subscription: MqttSubscription) {
        this.startFlow(new OutgoingUnsubscribeFlow(subscription));
    }

    public disconnect() {
        this.startFlow(new OutgoingDisconnectFlow(undefined));
    }

    protected registerClient(options: RegisterClientOptions) {
        this.startFlow(new OutgoingConnectFlow(options));
        this.connectTimer = this.executeDelayed(2000, () => {
            this.registerClient(options);
        });
    }

    public startFlow(flow: PacketFlow<any>) {
        try {
            if (this.writtenFlow) {
                this.sendingFlows.push(flow);
                this.handleSendingFlows();
            } else {
                const packet = flow.start();
                if (packet) {
                    this.writePacketToSocket(packet);
                    this.writtenFlow = flow;
                } else {
                    this.executeNextTick(() => this.finishFlow(flow));
                }
            }
        } catch (e) {
            this.emitWarning(e);
        }
    }

    protected continueFlow(flow: PacketFlow<any>, packet: MqttPacket) {
        try {
            const response = flow.next(packet);
            if (response) {
                if (this.writtenFlow) {
                    this.sendingFlows.push();
                } else {
                    this.writePacketToSocket(response);
                    this.writtenFlow = flow;
                    this.handleSendingFlows();
                }
            } else if (flow.finished) {
                this.executeNextTick(() => this.finishFlow(flow));
            }
        } catch (e) {
            this.emitError(e);
        }
    }

    protected finishFlow(flow: PacketFlow<any>) {
        if (flow.success) {
            if (!flow.silent) {
                this.emitFlow(flow.name, flow.result);
            }
        } else {
            this.emitWarning(new Error(flow.error));
        }
    }

    protected handleSendingFlows() {
        let flow: PacketFlow<any> = undefined;
        if (this.writtenFlow) {
            flow = this.writtenFlow;
            this.writtenFlow = undefined;
        }

        if (this.sendingFlows.length > 0) {
            this.writtenFlow = this.sendingFlows.pop();
            const packet = this.writtenFlow.start();
            if (packet) {
                this.writePacketToSocket(packet);
            } else {
                this.executeNextTick(() => this.finishFlow(this.writtenFlow));
            }
        }

        if (flow) {
            if (flow.finished) {
                this.executeNextTick(() => this.finishFlow(flow));
            } else {
                this.receivingFlows.push(flow);
            }
        }
    }

    protected writePacketToSocket(packet: MqttPacket) {
        console.log('write');
        const stream = new PacketStream();
        packet.write(stream);
        this.socket.write(stream.data, 'utf8',(err) => {
            if (err) this.emitWarning(err);
        });
    }

    protected async handleData(data: Buffer): Promise<void> {
        console.log(data.toString('hex'));
        try {
            const results = await this.parser.parse(data.toString('utf8'));

            if (results.length > 0) {
                results.forEach(this.handlePacket);
            }
        }catch(e) {
            this.emitWarning(e);
        }
    }

    protected async handlePacket(packet: MqttPacket) {
        console.log('handle');
        switch (packet.packetType) {
            case PacketTypes.TYPE_PUBLISH: {
                const pub = packet as PublishRequestPacket;
                this.startFlow(
                    new IncomingPublishFlow({
                            topic: pub.topic,
                            payload: pub.payload,
                            qosLevel: pub.qosLevel,
                            retained: pub.retained,
                            duplicate: pub.duplicate
                        },
                        pub.identifier));
                break;
            }
            case PacketTypes.TYPE_CONNACK: {
                this.setConnected();
                if (this.connectionSettings.keepAlive !== 0) {
                    const ref = this.executePeriodically((this.connectionSettings.keepAlive || 60) * 1000 - 500, () => {
                        this.startFlow(new OutgoingPingFlow());
                    });
                    this.timers.push(ref);
                }
            }
            case PacketTypes.TYPE_PINGRESP:
            case PacketTypes.TYPE_SUBACK:
            case PacketTypes.TYPE_UNSUBACK:
            case PacketTypes.TYPE_PUBREL:
            case PacketTypes.TYPE_PUBACK:
            case PacketTypes.TYPE_PUBREC:
            case PacketTypes.TYPE_PUBCOMP: {
                let flowFound = false;
                let usedFlow = undefined;
                for (const flow of this.receivingFlows) {
                    if (flow.accept(packet)) {
                        flowFound = true;
                        usedFlow = flow;

                        this.continueFlow(flow, packet);
                        break;
                    }
                }
                if (flowFound) {
                    this.receivingFlows = this.receivingFlows.filter((val) => val && !val.finished && (!val.finished || val !== usedFlow));
                } else {
                    this.emitWarning(new Error(`Unexpected packet: ${packet.packetType}`));
                }
                break;
            }
            default: {
                this.emitWarning(new Error(`Cannot handle packet of type ${packet.packetType}`));
            }
        }
    }

    protected setConnecting() {
        this.isConnecting = true;
        this.isConnected = false;
        this.isDisconnected = false;
        console.log('connecting');
    }

    protected setConnected() {
        this.isConnecting = false;
        this.isConnected = true;
        this.isDisconnected = false;
        this.stopExecuting(this.connectTimer);
        console.log('connect');
    }

    protected setDisconnected() {
        this.emit('disconnected');
        this.isConnecting = false;
        this.isConnected = false;
        this.isDisconnected = true;
        console.log('disconnect');
    }
}
