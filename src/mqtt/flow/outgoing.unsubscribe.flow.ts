import { PacketFlow } from './packet-flow';
import { MqttSubscription } from '../mqtt.types';
import { MqttPacket } from '../mqtt.packet';
import { IdentifiableBasePacket, UnsubscribeRequestPacket, UnsubscribeResponsePacket } from '../packets';
import { PacketTypes } from '../mqtt.constants';

export class OutgoingUnsubscribeFlow extends PacketFlow<MqttSubscription> {
    private readonly identifier: number;
    private readonly subscription: MqttSubscription;

    public constructor(subscription: MqttSubscription, identifier?: number) {
        super();
        this.subscription = subscription;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }

    public accept(packet: MqttPacket): boolean {
        return (
            packet.packetType === PacketTypes.TYPE_UNSUBACK &&
            (packet as UnsubscribeResponsePacket).identifier === this.identifier
        );
    }

    public get name(): string {
        return 'unsubscribe';
    }

    public next(): undefined {
        this.succeeded(this.subscription);
        return undefined;
    }

    public start(): MqttPacket {
        const packet = new UnsubscribeRequestPacket(this.subscription.topic);
        packet.identifier = this.identifier;
        return packet;
    }
}
