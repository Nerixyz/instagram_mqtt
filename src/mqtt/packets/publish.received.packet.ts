import {IdentifierPacket} from "./identifiable.packet";
import {PacketTypes} from "../mqtt.constants";

export class PublishReceivedPacket extends IdentifierPacket {

    constructor() {
        super(PacketTypes.TYPE_PUBREC);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }

}
