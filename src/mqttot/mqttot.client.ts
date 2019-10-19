import { MqttClient } from '../mqtt/mqtt.client';
import { ConnectRequestOptions } from '../mqtt/packets';
import { PacketFlow } from '../mqtt/flow/packet-flow';
import { MqttPacket } from '../mqtt/mqtt.packet';
import { PacketTypes } from '../mqtt/mqtt.constants';
import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { MqttMessage } from '../mqtt/mqtt.message';
import { compressDeflate } from '../shared';
import { ConnectResponsePacket } from '../mqtt/packets';

export class MQTToTClient extends MqttClient {
    protected connectPayload: Buffer;

    public constructor(options: { url: string; payload: Buffer }) {
        super({ url: options.url });
        this.connectPayload = options.payload;
    }

    protected registerClient(options: ConnectRequestOptions) {
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
