import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';

export class PingRequestPacket extends MqttPacket {
    public constructor() {
        super(PacketTypes.TYPE_PINGREQ);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(0);
        this.assertRemainingPacketLength(0);
    }
}
