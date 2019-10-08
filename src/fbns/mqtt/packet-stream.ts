/*

    Based on: https://github.com/binsoul/net-mqtt/blob/master/src/PacketStream.php
    Last revision: 10-Sep-19

 */
import {EndOfStreamError} from "./errors/end-of-stream.error";

export class PacketStream {
    set position(value: number) {
        this._position = value;
    }
    get position(): number {
        return this._position;
    }

    get data(): Buffer {
        return this._data;
    }

    get length(): number {
        return Buffer.byteLength(this.data);
    }

    get remainingBytes(): number {
        return this.length - this.position;
    }

    private _data: Buffer;

    private _position: number;

    private constructor(data?: string, length?: number, buffer?: Buffer) {
        this._data = data? Buffer.from(data) : length? Buffer.alloc(length) : buffer? buffer: undefined;
        this.position = 0;
    }

    public static fromlength(len: number) {
        return new PacketStream(undefined, len, undefined);
    }
    public static fromBuffer(buf: Buffer) {
        return new PacketStream(undefined, undefined, buf);
    }
    public static fromString(data: string) {
        return new PacketStream(data, undefined, undefined);
    }
    public static empty() {
        return new PacketStream(undefined, undefined, undefined);
    }


    private move(steps: number = 1): void {
        this._position += steps;
    }

    // General

    public seek(len: number): this {
        this.move(len);
        return this;
    }

    public cut(): this {
        this._data = this._data.slice(this._position) || undefined;
        this._position = 0;
        return this;
    }

    // Write

    public write(data: Buffer): this {
        this._position += data.length;
        if(this._data)
            this._data = Buffer.concat([this._data, data]);
        else
            this._data = data;
        return this;
    }
    public writeRawString(data: string): this {
        return  this.write(Buffer.from(data));
    }

    public writeByte(num: number): this {
        this.write(Buffer.from([num]));
        return this;
    }

    public writeWord(num: number): this {
        return this.write(Buffer.from([(num & 0xff00) >> 8, (num & 0xff)]));
    }

    public writeString(str: string): this {
        this.writeWord(Buffer.byteLength(str));
        return this.writeRawString(str);
    }

    // Read
    public read(len: number): Buffer {
        if (this.position > this.length || len > this.length - this.position) {
            throw new EndOfStreamError(
                `End of stream reached when trying to read ${len} bytes. content length=${this.length}, position=${this.position}`
            );
        }

        const buf = this._data.slice(this._position, this.position + len);
        this.move(len);
        return buf;
    }

    public readByte(): number {
        return this.read(1).readUInt8(0);
    }

    public readWord(): number {
       return this.read(2).readUInt16BE(0);
    }

    public readString(): string {
        const len = this.readWord();
        return this.read(len).toString('utf8');
    }
}
