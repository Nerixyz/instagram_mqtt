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

    get data(): string {
        return this._data;
    }

    get length(): number {
        return Buffer.byteLength(this.data);
    }

    get remainingBytes(): number {
        return this.length - this.position;
    }

    private _data: string;

    private _position: number;

    constructor(data?: string) {
        this._data = data || '';
        this.position = 0;
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
        this._data = this._data.substr(this._position) || '';
        this._position = 0;
        return this;
    }

    // Write

    public write(data: string): this {
        this.move(Buffer.byteLength(data));
        this._data += data;
        return this;
    }

    public writeByte(num: number): this {
        this.write(String.fromCharCode(num));
        return this;
    }

    public writeWord(num: number): this {
        this.write(String.fromCharCode((num & 0xff00) >> 8, (num & 0xff)));
        return this;
    }

    public writeString(str: string): this {
        this.writeWord(Buffer.byteLength(str));
        this.write(str);
        return this;
    }

    // Read
    public read(len: number): string {
        if (this.position > this.length || len > this.length - this.position) {
            throw new EndOfStreamError(
                `End of stream reached when trying to read ${len} bytes. content length=${this.length}, position=${this.position}`
            );
        }

        const str = this._data.substr(this._position, len);
        this.move(len);
        return str;
    }

    public readByte(): number {
        return this.read(1).charCodeAt(0);
    }

    public readWord(): number {
        const str = this.read(2);
        return (str.charCodeAt(0) << 8) | str.charCodeAt(1);
    }

    public readString(): string {
        const len = this.readWord();
        return this.read(len);
    }
}
