import { IdentifiableBasePacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';

export class SubscribeRequestPacket extends IdentifiableBasePacket {
    public get qosLevel(): number {
        return this._qosLevel;
    }

    public set qosLevel(value: number) {
        this.assertValidQosLevel(value);
        this._qosLevel = value;
    }
    public get topic(): string {
        return this._topic;
    }

    public set topic(value: string) {
        this.assertValidString(value);
        this._topic = value;
    }

    private _topic: string;
    private _qosLevel: number;

    public constructor(topic?: string, qosLevel: number = 1) {
        super(PacketTypes.TYPE_SUBSCRIBE);
        this.assertValidQosLevel(qosLevel);
        this.assertValidString(topic);
        this._topic = topic;
        this._qosLevel = qosLevel;
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(2);
        this.assertRemainingPacketLength();

        this.identifier = stream.readWord();
        this._topic = stream.readString();
        this._qosLevel = stream.readByte();

        this.assertValidQosLevel(this._qosLevel);
        this.assertValidString(this._topic);
    }

    public write(stream: PacketStream): void {
        const data = PacketStream.empty()
            .writeWord(this.generateIdentifier())
            .writeString(this._topic)
            .writeByte(this._qosLevel);
        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
