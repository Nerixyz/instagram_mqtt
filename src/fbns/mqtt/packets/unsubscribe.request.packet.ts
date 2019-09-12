import {IdentifiableBasePacket} from "./identifiable.packet";
import {PacketTypes} from "../mqtt.constants";
import {PacketStream} from "../packet-stream";

export class UnsubscribeRequestPacket extends IdentifiableBasePacket{
    get topic(): string {
        return this._topic;
    }

    set topic(value: string) {
        this.assertValidString(value);
        this._topic = value;
    }

    private _topic: string;

    constructor(topic?: string) {
        super(PacketTypes.TYPE_UNSUBSCRIBE);
        this.packetFlags = 2;
        this.assertValidString(topic);
        this._topic = topic;
    }

    read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(2);
        this.assertRemainingPacketLength();

        const originalPosition = stream.position;

        do{
            this.identifier = stream.readWord();
            this._topic = stream.readString();
        }while((stream.position - originalPosition) <= this.remainingPacketLength);
    }

    write(stream: PacketStream): void {
        const data = new PacketStream().writeWord(this.generateIdentifier()).writeString(this._topic);
        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }

}
