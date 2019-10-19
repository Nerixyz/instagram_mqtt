import { PacketFlow } from './packet-flow';
import { MqttMessage } from '../mqtt.message';
import { MqttPacket } from '../mqtt.packet';
import { IdentifiableBasePacket } from '../packets';
import { PublishRequestPacket } from '../packets';
import { PacketTypes } from '../mqtt.constants';
import { PublishAckPacket } from '../packets';
import { PublishReceivedPacket } from '../packets';
import { PublishCompletePacket } from '../packets';
import { PublishReleasePacket } from '../packets';

export class OutgoingPublishFlow extends PacketFlow<MqttMessage> {
    private readonly identifier: number;
    private readonly message: MqttMessage;
    private receivedPubRec: boolean = false;

    public constructor(message: MqttMessage, identifier?: number) {
        super();
        this.message = message;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }

    public accept(packet: MqttPacket): boolean {
        if (this.message.qosLevel === 0) {
            return false;
        }

        const packetType = packet.packetType;

        if (packetType === PacketTypes.TYPE_PUBACK && this.message.qosLevel === 1) {
            return (packet as PublishAckPacket).identifier === this.identifier;
        } else if (this.message.qosLevel === 2) {
            if (packetType === PacketTypes.TYPE_PUBREC) {
                return (packet as PublishReceivedPacket).identifier === this.identifier;
            } else if (this.receivedPubRec && packetType === PacketTypes.TYPE_PUBCOMP) {
                return (packet as PublishCompletePacket).identifier === this.identifier;
            }
        }
        return false;
    }

    public get name(): string {
        return 'publish';
    }

    public next(packet: MqttPacket): MqttPacket {
        const packetType = packet.packetType;

        if (packetType === PacketTypes.TYPE_PUBACK || packetType === PacketTypes.TYPE_PUBCOMP) {
            this.succeeded(this.message);
        } else if (packetType === PacketTypes.TYPE_PUBREC) {
            this.receivedPubRec = true;
            return new PublishReleasePacket(this.identifier);
        }
        return undefined;
    }

    public start(): MqttPacket {
        const packet = new PublishRequestPacket(this.message.topic, this.message.payload);
        packet.qosLevel = this.message.qosLevel || 0;
        packet.duplicate = this.message.duplicate || false;
        packet.retained = this.message.retained || false;

        if (this.message.qosLevel === 0) {
            this.succeeded(this.message);
        } else {
            packet.identifier = this.identifier;
        }

        return packet;
    }
}
