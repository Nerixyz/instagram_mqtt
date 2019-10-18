import {MqttClient} from "../mqtt/mqtt.client";
import {ConnectRequestOptions} from "../mqtt/packets/connect.request.packet";
import {PacketFlow} from "../mqtt/flow/packet-flow";
import {MqttPacket} from "../mqtt/mqtt.packet";
import {PacketTypes} from "../mqtt/mqtt.constants";
import {FbnsConnectRequestPacket} from "../fbns/fbns.connect-request.packet";
import {MQTToTConnectRequestPacket} from "./mqttot.connect-request-packet";

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
        return "fbnsConnect";
    }

    next(packet: MqttPacket): MqttPacket {
        console.log('next');
        this.succeeded(packet);
        return packet;
    }

    start(): MqttPacket {
        console.log('start');
        return new MQTToTConnectRequestPacket(this.payload);
    }

}

