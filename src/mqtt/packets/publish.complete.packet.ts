import { IdentifierPacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';

export class PublishCompletePacket extends IdentifierPacket {
    public constructor() {
        super(PacketTypes.TYPE_PUBCOMP);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
