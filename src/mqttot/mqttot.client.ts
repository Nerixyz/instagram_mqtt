import { MqttClient } from '../mqtt';
import { ConnectRequestOptions } from '../mqtt/packets';
import { PacketFlow } from '../mqtt/flow';
import { MqttPacket, MqttMessage, PacketTypes } from '../mqtt';
import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { compressDeflate, debugChannel } from '../shared';
import { ConnectResponsePacket } from '../mqtt/packets';

const __mqttotDebugChannel = debugChannel('mqttot');

export class MQTToTClient extends MqttClient {
    protected connectPayload: Buffer;

    protected _mqttotDebug = (msg: string, ...args: string[]) =>
        __mqttotDebugChannel(`${this.url.host}: ${msg}`, ...args);

    public constructor(options: { url: string; payload: Buffer }) {
        super({ url: options.url });
        this.connectPayload = options.payload;
        this._mqttotDebug(`Creating client`);
        this.registerListeners();
    }

    protected registerListeners() {
        this.on('disconnect', () => this._mqttotDebug('Disconnected.'));
    }

    protected registerClient(options: ConnectRequestOptions) {
        this._mqttotDebug(`Trying to register the client...`);
        this.startFlow(new MQTToTConnectFlow(this.connectPayload));
        this.connectTimer = this.executeDelayed(2000, () => {
            this.registerClient(options);
        });
    }

    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<void>}
     */
    public async mqttotPublish(message: MqttMessage) {
        this._mqttotDebug(`Publishing ${message.payload.byteLength}bytes to topic ${message.topic}`);
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

    public next(packet: ConnectResponsePacket): MqttPacket {
        this.succeeded(packet);
        return undefined;
    }

    public start(): MqttPacket {
        return new MQTToTConnectRequestPacket(this.payload);
    }
}
