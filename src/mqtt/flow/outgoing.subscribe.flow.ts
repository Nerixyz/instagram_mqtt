import { PacketFlow } from './packet-flow';
import { MqttSubscription } from '../mqtt.types';
import { MqttPacket } from '../mqtt.packet';
import { SubscribeRequestPacket } from '../packets';
import { IdentifiableBasePacket } from '../packets';
import { PacketTypes } from '../mqtt.constants';
import { SubscribeResponsePacket } from '../packets';

export class OutgoingSubscribeFlow extends PacketFlow<MqttSubscription> {
    private readonly subscription: MqttSubscription;
    private readonly identifier: number;

    public constructor(subscription: MqttSubscription, identifier?: number) {
        super();
        this.subscription = subscription;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }
    public accept(packet: MqttPacket): boolean {
        return (
            packet.packetType === PacketTypes.TYPE_SUBACK &&
            (packet as SubscribeResponsePacket).identifier === this.identifier
        );
    }

    public get name(): string {
        return 'subscribe';
    }

    public next(packet: SubscribeResponsePacket): undefined {
        if (packet.returnCodes.every(value => !packet.isError(value))) {
            this.succeeded(this.subscription);
        } else {
            this.errored(`Failed to subscribe to ${this.subscription.topic}`);
        }
        return undefined;
    }

    public start(): MqttPacket {
        const packet = new SubscribeRequestPacket(this.subscription.topic, this.subscription.qosLevel || 0);
        packet.identifier = this.identifier;
        return packet;
    }
}
