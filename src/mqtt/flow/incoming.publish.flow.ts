import {PacketFlow} from "./packet-flow";
import {MqttMessage} from "../mqtt.message";
import {MqttPacket} from "../mqtt.packet";
import {PublishAckPacket} from "../packets/publish.ack.packet";
import {PublishReceivedPacket} from "../packets/publish.received.packet";
import {IdentifiableBasePacket} from "../packets/identifiable.packet";
import {PacketTypes} from "../mqtt.constants";
import {PublishReleasePacket} from "../packets/publish.release.packet";
import {PublishCompletePacket} from "../packets/publish.complete.packet";

export class IncomingPublishFlow extends PacketFlow<MqttMessage>{

    private identifier?: number;
    private message: MqttMessage;

    constructor(message: MqttMessage, identifier?: number) {
        super();
        this.message = message;
        this.identifier = identifier;
    }

    accept(packet: MqttPacket): boolean {
        if(this.message.qosLevel !== 2 || packet.packetType !== PacketTypes.TYPE_PUBREL){
            return false;
        }
        return (packet as PublishReleasePacket).identifier === this.identifier;
    }

    get name(): string {
        return "message";
    }

    next(packet: MqttPacket): MqttPacket {
        this.succeeded(this.message);

        const response = new PublishCompletePacket();
        response.identifier = this.identifier;
        return response;
    }

    start(): MqttPacket {
        let packet: IdentifiableBasePacket;
        let emit = true;
        if(this.message.qosLevel === 1){
            packet = new PublishAckPacket();
        }else if(this.message.qosLevel === 2) {
            packet = new PublishReceivedPacket();
            emit = false;
        }

        if(packet) {
            packet.identifier = this.identifier;
        }

        if(emit) {
            this.succeeded(this.message);
        }
        return packet;
    }

}
