/*

    Based on: https://github.com/binsoul/net-mqtt/blob/master/src/PacketStream.php
    Last revision: 10-Sep-19

 */
import { EndOfStreamError } from './errors';

export class PacketStream {
    public set position(value: number) {
        this._position = value;
    }
    public get position(): number {
        return this._position;
    }

    public get data(): Buffer {
        return this._data;
    }

    public get length(): number {
        return this._data ? this._data.length : 0;
    }

    public get remainingBytes(): number {
        return this.length - this.position;
    }

    private _data: Buffer;

    private _position: number;

    private constructor(data?: string, length?: number, buffer?: Buffer) {
        this._data = data ? Buffer.from(data) : length ? Buffer.alloc(length) : buffer ? buffer : Buffer.from([]);
        this.position = 0;
    }

    public static fromLength(len: number) {
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

    /**
     *
     * @param {number} steps - steps to move
     * @returns {number} Position before moving
     */
    private move(steps = 1): number {
        this._position += steps;
        if (this._position > this.length) throw new EndOfStreamError('Reached end of stream');
        return this._position - steps;
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
        if (this._data) this._data = Buffer.concat([this._data, data]);
        else this._data = data;
        this.move(data.length);
        return this;
    }
    public writeRawString(data: string): this {
        return this.write(Buffer.from(data));
    }

    public writeByte(num: number): this {
        this.write(Buffer.from([num]));
        return this;
    }

    public writeWord(num: number): this {
        return this.write(Buffer.from([(num & 0xff00) >> 8, num & 0xff]));
    }

    public writeString(str: string): this {
        this.writeWord(Buffer.byteLength(str));
        return this.writeRawString(str);
    }

    // Read
    public read(len: number): Buffer {
        if (this.position > this.length || len > this.length - this.position) {
            throw new EndOfStreamError(
                `End of stream reached when trying to read ${len} bytes. content length=${this.length}, position=${this.position}`,
            );
        }

        const buf = this._data.slice(this._position, this.position + len);
        this.move(len);
        return buf;
    }

    public readSlice(end: number) {
        const buf = this._data.slice(this._position, end);
        this.move(buf.length);
        return buf;
    }

    public readByte(): number {
        return this._data.readUInt8(this.move(1));
    }

    public readWord(): number {
        return this._data.readUInt16BE(this.move(2));
    }

    public readString(): string {
        const len = this.readWord();
        return this.read(len).toString('utf8');
    }

    public readStringAsBuffer(): Buffer {
        return this.read(this.readWord());
    }
}
