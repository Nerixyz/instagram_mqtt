import {PacketFlow} from "./packet-flow";
import {MqttSubscription} from "../mqtt.types";
import {MqttPacket} from "../mqtt.packet";
import {IdentifiableBasePacket} from "../packets/identifiable.packet";
import {UnsubscribeRequestPacket} from "../packets/unsubscribe.request.packet";
import {PacketTypes} from "../mqtt.constants";
import {UnsubscribeResponsePacket} from "../packets/unsubscribe.response.packet";

export class OutgoingUnsubscribeFlow extends PacketFlow<MqttSubscription> {

    private identifier: number;
    private subscription: MqttSubscription;

    constructor(subscription: MqttSubscription, identifier?: number) {
        super();
        this.subscription = subscription;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }

    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_UNSUBACK && (packet as UnsubscribeResponsePacket).identifier === this.identifier;
    }

    get name(): string {
        return "unsubscribe";
    }

    next(packet: MqttPacket): MqttPacket {
        this.succeeded(this.subscription);
        return undefined;
    }

    start(): MqttPacket {
        const packet = new UnsubscribeRequestPacket(this.subscription.topic);
        packet.identifier = this.identifier;
        return packet;
    }

}
