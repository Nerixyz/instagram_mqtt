import { IdentifierPacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';

export class PublishReleasePacket extends IdentifierPacket {
    public constructor(identifier?: number) {
        super(PacketTypes.TYPE_PUBREL);
        this.packetFlags = 2;
        this.identifier = identifier ?? IdentifierPacket.generateIdentifier();
    }

    protected getExpectedPacketFlags(): number {
        return 2;
    }
}
