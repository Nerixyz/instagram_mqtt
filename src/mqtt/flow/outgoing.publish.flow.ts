import {PacketFlow} from "./packet-flow";
import {MqttMessage} from "../mqtt.message";
import {MqttPacket} from "../mqtt.packet";
import {IdentifiableBasePacket} from "../packets/identifiable.packet";
import {PublishRequestPacket} from "../packets/publish.request.packet";
import {PacketTypes} from "../mqtt.constants";
import {PublishAckPacket} from "../packets/publish.ack.packet";
import {PublishReceivedPacket} from "../packets/publish.received.packet";
import {PublishCompletePacket} from "../packets/publish.complete.packet";
import {PublishReleasePacket} from "../packets/publish.release.packet";

export class OutgoingPublishFlow extends PacketFlow<MqttMessage>{

    private identifier: number;
    private message: MqttMessage;
    private receivedPubRec: boolean = false;

    constructor(message: MqttMessage, identifier?: number) {
        super();
        this.message = message ;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }

    accept(packet: MqttPacket): boolean {
        if(this.message.qosLevel === 0) {
            return false;
        }

        const packetType = packet.packetType;

        if(packetType === PacketTypes.TYPE_PUBACK && this.message.qosLevel === 1) {
            return (packet as PublishAckPacket).identifier === this.identifier;
        }else if(this.message.qosLevel === 2) {
            if(packetType === PacketTypes.TYPE_PUBREC) {
                return (packet as PublishReceivedPacket).identifier === this.identifier;
            } else if (this.receivedPubRec && packetType === PacketTypes.TYPE_PUBCOMP) {
                return (packet as PublishCompletePacket).identifier === this.identifier;
            }
        }
        return false;
    }

    get name(): string {
        return "publish";
    }

    next(packet: MqttPacket): MqttPacket {
        const packetType = packet.packetType;

        if(packetType === PacketTypes.TYPE_PUBACK || packetType === PacketTypes.TYPE_PUBCOMP) {
            this.succeeded(this.message);
        } else if(packetType === PacketTypes.TYPE_PUBREC) {
            this.receivedPubRec = true;
            return new PublishReleasePacket(this.identifier);
        }
        return undefined;
    }

    start(): MqttPacket {
        const packet = new PublishRequestPacket(this.message.topic, this.message.payload);
        packet.qosLevel = this.message.qosLevel || 0;
        packet.duplicate = this.message.duplicate || false;
        packet.retained = this.message.retained || false;

        if(this.message.qosLevel === 0) {
            this.succeeded(this.message);
        }else {
            packet.identifier = this.identifier;
        }

        return packet;
    }

}
