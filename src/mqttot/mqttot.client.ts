import { MqttClient, RegisterClientOptions } from '../mqtt';
import { PacketFlow } from '../mqtt/flow';
import { MqttPacket, MqttMessage, PacketTypes } from '../mqtt';
import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { compressDeflate, debugChannel } from '../shared';
import { ConnectResponsePacket } from '../mqtt/packets';

export class MQTToTClient extends MqttClient {
    protected connectPayload: Buffer;

    protected mqttotDebug = (msg: string, ...args: string[]) =>
        debugChannel('mqttot')(`${this.url.host}: ${msg}`, ...args);

    public constructor(options: { url: string; payload: Buffer }) {
        super({ url: options.url });
        this.connectPayload = options.payload;
        this.mqttotDebug(`Creating client`);
        this.registerListeners();
    }

    protected registerListeners() {
        this.on('disconnect', () => this.mqttotDebug('Disconnected.'));
        const printErrorOrWarning = (type: string) => (e: Error | string) => {
            if (typeof e === 'string') {
                this.mqttotDebug(`${type}: ${e}`);
            } else {
                this.mqttotDebug(`${type}: ${e.message}\n\tStack: ${e.stack}`);
            }
        };
        this.on('error', printErrorOrWarning('Error'));
        this.on('warning', printErrorOrWarning('Warning'));
    }

    protected registerClient(options: RegisterClientOptions, noNewPromise = false): Promise<any> {
        this.mqttotDebug(`Trying to register the client...`);
        let promise;
        if (noNewPromise) {
            promise = this.startFlow(new MQTToTConnectFlow(this.connectPayload));
        } else {
            promise = new Promise<void>(resolve => {
                this.startInfo = { resolve };
            });
            this.startFlow(new MQTToTConnectFlow(this.connectPayload)).then(() => this.startInfo?.resolve());
        }
        this.connectTimer = this.executeDelayed(2000, () => {
            this.registerClient(options, true).then(() => this.startInfo?.resolve());
        });
        return promise;
    }

    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<void>}
     */
    public async mqttotPublish(message: MqttMessage) {
        this.mqttotDebug(`Publishing ${message.payload.byteLength}bytes to topic ${message.topic}`);
        this.publish({
            topic: message.topic,
            payload: await compressDeflate(message.payload),
            qosLevel: message.qosLevel,
        });
    }
}

export class MQTToTConnectFlow extends PacketFlow<ConnectResponsePacket> {
    private readonly payload: Buffer;

    public constructor(payload: Buffer) {
        super();
        this.payload = payload;
    }

    public accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    public get name(): string {
        return 'mqttotConnect';
    }

    public next(packet: ConnectResponsePacket): undefined {
        this.succeeded(packet);
        return undefined;
    }

    public start(): MqttPacket {
        return new MQTToTConnectRequestPacket(this.payload);
    }
}
