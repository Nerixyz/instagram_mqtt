import {MqttPacket} from "../mqtt.packet";
import {PacketTypes} from "../mqtt.constants";
import {PacketStream} from "../packet-stream";

export class PingResponsePacket extends MqttPacket {
    constructor() {
        super(PacketTypes.TYPE_PINGRESP);
    }

    read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(0);
        this.assertRemainingPacketLength(0);
    }
}
