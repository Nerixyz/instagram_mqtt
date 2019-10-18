import {MqttClient} from "../mqtt/mqtt.client";
import {ConnectRequestOptions} from "../mqtt/packets/connect.request.packet";
import {PacketFlow} from "../mqtt/flow/packet-flow";
import {MqttPacket} from "../mqtt/mqtt.packet";
import {PacketTypes} from "../mqtt/mqtt.constants";
import {FbnsConnectRequestPacket} from "../fbns/fbns.connect-request.packet";
import {MQTToTConnectRequestPacket} from "./mqttot.connect-request-packet";
import {MqttMessage} from "../mqtt/mqtt.message";
import {compressDeflate} from "../shared";

export class MQTToTClient extends MqttClient{
    protected connectPayload: Buffer;

    constructor(options: { url: string, payload: Buffer }) {
        super({url: options.url});
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
        })
    }
}

export class MQTToTConnectFlow extends PacketFlow<any> {

    private readonly payload: Buffer;

    constructor(payload: Buffer) {
        super();
        this.payload = payload;
    }

    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    get name(): string {
        return "mqttotConnect";
    }

    next(packet: MqttPacket): MqttPacket {
        console.log('next');
        this.succeeded(packet);
        return undefined;
    }

    start(): MqttPacket {
        console.log('start');
        return new MQTToTConnectRequestPacket(this.payload);
    }

}

