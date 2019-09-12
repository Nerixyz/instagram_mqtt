import {MqttPacket} from "../mqtt.packet";
import {PacketStream} from "../packet-stream";

export abstract class IdentifiableBasePacket extends MqttPacket{
    set identifier(value: number) {
        this._identifier = Math.max(Math.min(value, 0xffff), 0);
    }
    get identifier(): number {
        return this._identifier;
    }
    private static nextId = 0;
    private _identifier: number;

    protected abstract getExpectedPacketFlags(): number;

    protected generateIdentifier() {
        if(typeof this._identifier === 'undefined') {
            this._identifier = IdentifierPacket.generateIdentifier();
        }
        return this._identifier;
    }

    public static generateIdentifier(): number {
        IdentifierPacket.nextId ++;
        IdentifierPacket.nextId &= 0xffff;
        return IdentifierPacket.nextId;
    }
}

export abstract class IdentifierPacket extends IdentifiableBasePacket {

    protected constructor(type: number) {
        super(type);
    }

    read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(this.getExpectedPacketFlags());
        this.assertRemainingPacketLength();

        this.identifier = stream.readWord();
    }

    write(stream: PacketStream): void {
        this.remainingPacketLength = 2;
        super.write(stream);
        stream.writeWord(this.generateIdentifier());
    }
}
