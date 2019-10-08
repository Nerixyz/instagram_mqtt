import {IdentifiableBasePacket, IdentifierPacket} from "./identifiable.packet";
import {PacketTypes} from "../mqtt.constants";
import {PacketStream} from "../packet-stream";

export class PublishRequestPacket extends IdentifiableBasePacket {
    get payload(): string {
        return this._payload;
    }
    get topic(): string {
        return this._topic;
    }

    set topic(value: string) {
        this.assertValidString(value);
        this._topic = value;
    }

    get duplicate(): boolean {
        return (this.packetFlags & 8) === 8;
    }

    set duplicate(val: boolean) {
        if(val) {
            this.packetFlags |= 8;
        } else {
            this.packetFlags &= ~8;
        }
    }

    get retained(): boolean {
        return (this.packetFlags & 1) === 1;
    }

    set retained(val: boolean) {
        if(val) {
            this.packetFlags |= 1;
        } else {
            this.packetFlags &= ~1;
        }
    }

    get qosLevel(): number {
        return  (this.packetFlags & 6) >> 1;
    }

    set qosLevel(val: number) {
        this.assertValidQosLevel(val);
        this.packetFlags |= (val & 3) << 1;
    }

    private _topic: string;
    private _payload: string;

    constructor(topic?: string, payload?: string) {
        super(PacketTypes.TYPE_PUBLISH);
        this._topic = topic;
        this._payload = payload;
    }

    read(stream: PacketStream): void {
        super.read(stream);
        this.assertRemainingPacketLength();
        const lastPos = stream.position;
        this._topic = stream.readString();
        this.identifier = undefined;
        if(this.qosLevel) {
            this.identifier = stream.readWord();
        }

        const payloadLength = this.remainingPacketLength - (stream.position - lastPos);
        this._payload = stream.read(payloadLength).toString('utf8');
    }

    write(stream: PacketStream): void {
        const data = PacketStream.empty().writeString(this._topic);
        if(this.qosLevel) {
            data.writeWord(this.generateIdentifier());
        }

        data.writeRawString(this._payload);
        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }

}
