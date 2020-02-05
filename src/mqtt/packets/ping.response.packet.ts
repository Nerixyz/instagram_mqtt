import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';

export class PingResponsePacket extends MqttPacket {
    public constructor() {
        super(PacketTypes.TYPE_PINGRESP);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
    }
}
