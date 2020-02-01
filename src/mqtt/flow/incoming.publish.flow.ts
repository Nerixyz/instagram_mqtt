import { PacketFlow } from './packet-flow';
import { MqttMessage } from '../mqtt.message';
import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import {
    IdentifiableBasePacket,
    PublishAckPacket,
    PublishCompletePacket,
    PublishReceivedPacket,
    PublishReleasePacket,
} from '../packets';

export class IncomingPublishFlow extends PacketFlow<MqttMessage> {
    private readonly identifier?: number;
    private readonly message: MqttMessage;

    public constructor(message: MqttMessage, identifier?: number) {
        super();
        this.message = message;
        this.identifier = identifier;
    }

    public accept(packet: MqttPacket): boolean {
        if (this.message.qosLevel !== 2 || packet.packetType !== PacketTypes.TYPE_PUBREL) {
            return false;
        }
        return (packet as PublishReleasePacket).identifier === this.identifier;
    }

    public get name(): string {
        return 'message';
    }

    public next(): MqttPacket {
        this.succeeded(this.message);

        const response = new PublishCompletePacket();
        response.identifier = this.identifier ?? -1;
        return response;
    }

    public start(): MqttPacket | undefined {
        let packet: IdentifiableBasePacket | undefined = undefined;
        let emit = true;
        if (this.message.qosLevel === 1) {
            packet = new PublishAckPacket();
        } else if (this.message.qosLevel === 2) {
            packet = new PublishReceivedPacket();
            emit = false;
        }

        if (packet) {
            packet.identifier = this.identifier ?? -1;
        }

        if (emit) {
            this.succeeded(this.message);
        }
        return packet;
    }
}
