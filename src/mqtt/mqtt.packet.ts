import { PacketStream } from './packet-stream';

export abstract class MqttPacket {
    public get packetType(): number {
        return this._packetType;
    }
    private readonly _packetType: number;
    protected packetFlags = 0;
    protected remainingPacketLength = 0;

    protected constructor(packetType: number) {
        this._packetType = packetType;
    }

    public read(stream: PacketStream): void {
        const typeAndFlags = stream.readByte();
        const type = (typeAndFlags & 0xf0) >> 4;
        const flags = typeAndFlags & 0x0f;
        if (type !== this._packetType) {
            throw new Error('Invalid packet type');
        }

        this.packetFlags = flags;
        this.readRemainingLength(stream);
    }

    public write(stream: PacketStream): void {
        stream.writeByte(((this._packetType & 0x0f) << 4) | (this.packetFlags & 0x0f));
        this.writeRemainingLength(stream);
    }

    private readRemainingLength(stream: PacketStream): void {
        this.remainingPacketLength = 0;
        let multiplier = 1;

        let encodedByte;
        do {
            encodedByte = stream.readByte();

            this.remainingPacketLength += (encodedByte & 0x7f) * multiplier;
            multiplier *= 0x80;

            if (multiplier > Math.pow(0x80, 4)) {
                throw new Error('Invalid length');
            }
        } while ((encodedByte & 0x80) !== 0);
    }

    private writeRemainingLength(stream: PacketStream): void {
        /*let x = this.remainingPacketLength;
        do {
            let encodedByte = x % 0x80;
            x = Math.floor(x / 0x80);
            if(x > 0){
                encodedByte |= 0x80;
            }
            stream.writeByte(encodedByte);
        }while (x > 0);*/

        let num = this.remainingPacketLength;
        let digit = 0;
        do {
            digit = num % 128 | 0;
            num = (num / 128) | 0;
            if (num > 0) digit = digit | 0x80;

            stream.writeByte(digit);
        } while (num > 0);
    }

    protected assertPacketFlags(flags: number): void {
        if (this.packetFlags !== flags) {
            throw new Error(`Expected flags ${flags} but got ${this.packetFlags}`);
        }
    }

    protected assertRemainingPacketLength(expected?: number): void {
        if (typeof expected === 'number' && this.remainingPacketLength !== expected) {
            throw new Error(
                `Expected remaining packet length of ${expected} bytes but got ${this.remainingPacketLength}`,
            );
        }
        if (!expected && this.remainingPacketLength <= 0) {
            throw new Error('Expected payload but remaining packet length is 0.');
        }
    }

    protected assertValidStringLength(str: string): void {
        if (str.length > 0xffff) {
            throw new Error(`The string ${str.substring(0, 20)} is longer than 0xffff bytes.`);
        }
    }

    protected assertValidString(str: string): void {
        this.assertValidStringLength(str);
        /* eslint no-control-regex: "off" */
        if (str.match(/[\xD8-\xDF][\x00-\xFF]|\x00\x00/) !== null) {
            throw new Error(`The string ${str.substring(0, 20)} contains invalid characters`);
        }
    }

    protected assertValidQosLevel(level: number): void {
        if (level < 0 || level > 2) {
            throw new Error(`Invalid QoS level ${level}.`);
        }
    }

    public toString(): string {
        const stream = PacketStream.empty();

        return stream.data.toString('utf8');
    }
}
