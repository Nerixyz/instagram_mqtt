import { IdentifierPacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';

export class UnsubscribeResponsePacket extends IdentifierPacket {
    public constructor() {
        super(PacketTypes.TYPE_UNSUBACK);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
