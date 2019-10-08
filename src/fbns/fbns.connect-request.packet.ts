import {MqttPacket} from "./mqtt/mqtt.packet";
import {PacketTypes} from './mqtt/mqtt.constants';
import {PacketStream} from "./mqtt/packet-stream";

export class FbnsConnectRequestPacket extends MqttPacket {
    get protocolName(): string {
        return this._protocolName;
    }

    set protocolName(value: string) {
        this.assertValidStringLength(value);
        this._protocolName = value;
    }
    get keepAlive(): number {
        return this._keepAlive;
    }

    set keepAlive(value: number) {
        if(value > 0xffff) {
            throw new Error('KeepAlive was greater than 0xffff');
        }
        this._keepAlive = value;
    }
    get flags(): number {
        return this._flags;
    }

    set flags(value: number) {
        if(value > 0xff){
            throw new Error('Flags were greater than 0xff');
        }
        this._flags = value;
    }

    // only 3 is allowed
    private protocolLevel: number = 3;
    private _protocolName: string = 'MQTToT';
    private _flags: number = 194;
    private _keepAlive: number = 900;
    public payload: string;

    constructor(payload?: string) {
        super(PacketTypes.TYPE_CONNECT);
        this.payload = payload;
    }

    read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(0);
        this.assertRemainingPacketLength();

        const originalPosition = stream.position;
        this._protocolName = stream.readString();
        this.protocolLevel = stream.readByte();
        this._flags = stream.readByte();
        this._keepAlive = stream.readWord();

        const payloadLength = this.remainingPacketLength - (stream.position - originalPosition);
        this.payload = stream.read(payloadLength).toString('utf8');
    }

    write(stream: PacketStream): void {
        const data = PacketStream.empty()
            .writeString(this._protocolName)
            .writeByte(this.protocolLevel)
            .writeByte(this._flags)
            .writeWord(this._keepAlive)
            .writeRawString(this.payload);

        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

}
