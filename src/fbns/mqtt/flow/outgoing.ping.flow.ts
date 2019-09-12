import {PacketFlow} from "./packet-flow";
import {MqttPacket} from "../mqtt.packet";
import {PingRequestPacket} from "../packets/ping.request.packet";
import {PacketTypes} from "../mqtt.constants";

export class OutgoingPingFlow extends PacketFlow<any>{
    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_PINGRESP;
    }

    get name(): string {
        return "ping";
    }

    next(packet: MqttPacket): MqttPacket {
        this.succeeded(undefined);
        return undefined;
    }

    start(): MqttPacket {
        return new PingRequestPacket();
    }

}
