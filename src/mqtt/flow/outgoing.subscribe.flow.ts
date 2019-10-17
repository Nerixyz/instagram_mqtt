import {PacketFlow} from "./packet-flow";
import {MqttSubscription} from "../mqtt.types";
import {MqttPacket} from "../mqtt.packet";
import {SubscribeRequestPacket} from "../packets/subscribe.request.packet";
import {IdentifiableBasePacket} from "../packets/identifiable.packet";
import {PacketTypes} from "../mqtt.constants";
import {SubscribeResponsePacket} from "../packets/subscribe.response.packet";

export class OutgoingSubscribeFlow extends PacketFlow<MqttSubscription>{
    private readonly subscription: MqttSubscription;
    private readonly identifier: number;

    constructor(subscription: MqttSubscription, identifier?: number) {
        super();
        this.subscription = subscription;
        this.identifier = identifier || IdentifiableBasePacket.generateIdentifier();
    }
    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_SUBACK && (packet as SubscribeResponsePacket).identifier === this.identifier;
    }

    get name(): string {
        return "subscribe";
    }

    next(packet: MqttPacket): MqttPacket {
        const response = packet as SubscribeResponsePacket;
        if(response.returnCodes.every(value => !response.isError(value))) {
            this.succeeded(this.subscription);
        }else {
            this.errored(`Failed to subscribe to ${this.subscription.topic}`);
        }
        return undefined;
    }

    start(): MqttPacket {
        const packet = new SubscribeRequestPacket(this.subscription.topic, this.subscription.qosLevel || 0);
        packet.identifier = this.identifier;
        return packet;
    }

}
