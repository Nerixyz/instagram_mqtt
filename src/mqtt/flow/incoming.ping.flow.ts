import {PacketFlow} from "./packet-flow";
import {MqttPacket} from "../mqtt.packet";
import {PingResponsePacket} from "../packets/ping.response.packet";

export class IncomingPingFlow extends PacketFlow<any> {
    accept(packet: MqttPacket): boolean {
        return false;
    }

    get name(): string {
        return "pong";
    }

    next(packet: MqttPacket): MqttPacket {
        return undefined;
    }

    start(): MqttPacket {
        this.succeeded(undefined);
        return new PingResponsePacket();
    }
}
