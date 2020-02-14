import { InvalidDirectionError, MqttPacket, PacketStream, PacketTypes } from 'mqtts';

export class MQTToTConnectRequestPacket extends MqttPacket {
    public get protocolName(): string {
        return this._protocolName;
    }

    public set protocolName(value: string) {
        this.assertValidStringLength(value);
        this._protocolName = value;
    }
    public get keepAlive(): number {
        return this._keepAlive;
    }

    public set keepAlive(value: number) {
        if (value > 0xffff) {
            throw new Error('KeepAlive was greater than 0xffff');
        }
        this._keepAlive = value;
    }
    public get flags(): number {
        return this._flags;
    }

    public set flags(value: number) {
        if (value > 0xff) {
            throw new Error('Flags were greater than 0xff');
        }
        this._flags = value;
    }

    // only 3 is allowed
    private protocolLevel = 3;
    private _protocolName = 'MQTToT';
    private _flags = 194;
    private _keepAlive = 60;
    public payload: Buffer;

    public constructor(payload?: Buffer) {
        super(PacketTypes.TYPE_CONNECT);
        this.payload = payload ?? Buffer.from([]);
    }

    public read(): void {
        throw new InvalidDirectionError('read');
    }

    public write(stream: PacketStream): void {
        const data = PacketStream.empty()
            .writeString(this._protocolName)
            .writeByte(this.protocolLevel)
            .writeByte(this._flags)
            .writeWord(this._keepAlive)
            .write(this.payload);

        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }
}
