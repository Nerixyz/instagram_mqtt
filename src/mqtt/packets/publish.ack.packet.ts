import { IdentifierPacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';

export class PublishAckPacket extends IdentifierPacket {
    public constructor() {
        super(PacketTypes.TYPE_PUBACK);
    }
    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
