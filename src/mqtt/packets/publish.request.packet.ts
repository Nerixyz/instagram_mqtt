import { IdentifiableBasePacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';
import { EndOfStreamError } from '../errors';

export class PublishRequestPacket extends IdentifiableBasePacket {
    public get payload(): Buffer {
        return this._payload;
    }
    public get topic(): string {
        return this._topic;
    }

    public set topic(value: string) {
        this.assertValidString(value);
        this._topic = value;
    }

    public get duplicate(): boolean {
        return (this.packetFlags & 8) === 8;
    }

    public set duplicate(val: boolean) {
        if (val) {
            this.packetFlags |= 8;
        } else {
            this.packetFlags &= ~8;
        }
    }

    public get retained(): boolean {
        return (this.packetFlags & 1) === 1;
    }

    public set retained(val: boolean) {
        if (val) {
            this.packetFlags |= 1;
        } else {
            this.packetFlags &= ~1;
        }
    }

    public get qosLevel(): number {
        return (this.packetFlags & 6) >> 1;
    }

    public set qosLevel(val: number) {
        this.assertValidQosLevel(val);
        this.packetFlags |= (val & 3) << 1;
    }

    private _topic: string;
    private _payload: Buffer;

    public constructor(topic?: string, payload?: Buffer | string | undefined) {
        super(PacketTypes.TYPE_PUBLISH);
        this._topic = topic ?? '';
        this._payload = payload ? (payload instanceof Buffer ? payload : Buffer.from(payload)) : Buffer.from([]);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        //this.assertRemainingPacketLength();
        const lastPos = stream.position;
        this._topic = stream.readString();
        this.identifier = NaN;
        if (this.qosLevel) {
            this.identifier = stream.readWord();
        }

        const payloadLength = this.remainingPacketLength - (stream.position - lastPos);
        if (payloadLength === 0) return;
        if (payloadLength > stream.length - stream.position) throw new EndOfStreamError();

        this._payload = stream.read(payloadLength);
    }

    public write(stream: PacketStream): void {
        const data = PacketStream.empty().writeString(this._topic);
        if (this.qosLevel) {
            data.writeWord(this.generateIdentifier());
        }

        data.write(this._payload);
        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
