import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';

export class DisconnectRequestPacket extends MqttPacket {
    public constructor() {
        super(PacketTypes.TYPE_DISCONNECT);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        // this.assertPacketFlags(0); = 2?
        this.assertRemainingPacketLength(0);
    }
}
