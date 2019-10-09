export interface ThriftMessage {
    context: string;
    field: number;
    value: any;
    /* see  FbnsTypes*/
    type: number;
}

export const ThriftTypes = {
    STOP: 0x00,
    TRUE: 0x01,
    FALSE: 0x02,
    BYTE: 0x03,
    INT_16: 0x04,
    INT_32: 0x05,
    INT_64: 0x06,
    DOUBLE: 0x07,
    BINARY: 0x08,
    LIST: 0x09,
    SET: 0x0a,
    MAP: 0x0b,
    STRUCT: 0x0c,
    FLOAT: 0x0d,
};

export function thriftRead(message: Buffer) {
    const reader = new BufferReader(message);
    const messages: ThriftMessage[] = [];

    let context = '';
    let position = 0;
    while (position < message.length) {
        const type = reader.readField();
        switch (type) {
            case ThriftTypes.STOP: {
                if (reader.stack.length === 0) {
                    return messages;
                }
                reader.popStack();
                context = reader.stack.join('/');
                break;
            }
            case ThriftTypes.TRUE:
            case ThriftTypes.FALSE: {
                messages.push({
                    context,
                    field: reader.field,
                    value: type === ThriftTypes.TRUE,
                    type,
                });
                break;
            }
            case ThriftTypes.BYTE: {
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readSByte(),
                    type,
                });
                break;
            }
            case ThriftTypes.INT_16:
            case ThriftTypes.INT_32:
            case ThriftTypes.INT_64: {
                messages.push({
                    context,
                    field: reader.field,
                    value: BufferReader.fromZigZag(reader.readVarInt()),
                    type,
                });
                break;
            }
            case ThriftTypes.BINARY: {
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readString(reader.readVarInt()),
                    type,
                });
                break;
            }
            case ThriftTypes.LIST: {
                const byte = reader.readByte();
                let size = byte >> 4;
                const listType = byte & 0x0f;
                if (size === 0x0f)
                    size = reader.readVarInt();
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readList(size, listType),
                    type: (listType << 8) | type,
                });
                break;
            }
            case ThriftTypes.STRUCT: {
                reader.pushStack();
                context = reader.stack.join('/');
                break;
            }

        }
    }
    return messages;
}

export class BufferReader {
    private buffer: Buffer;

    private _stack: number[] = [];
    public get stack(): number[] {
        return this._stack;
    }

    private _position: number = 0;
    public get position(): number {
        return this._position;
    };

    public get length(): number {
        return this.buffer.length;
    }

    private _field: number = 0;
    public get field(): number {
        return this._field;
    };

    constructor(buffer) {
        this.buffer = buffer;
    }

    private move(bytes: number) {
        this._position = Math.min(Math.max(this._position + bytes, 0), this.buffer.length);
        return this._position - bytes;
    }

    public readByte = () => this.buffer.readUInt8(this.move(1));
    public readSByte = () => this.buffer.readInt8(this.move(1));

    public readVarInt(): number {
        let shift = 0;
        let result = 0;
        while (this._position < this.length) {
            const byte = this.readByte();
            result |= (byte & 0x7f) << shift;
            if ((byte & 0x80) == 0) {
                break;
            }
            shift += 7;
        }
        return result;
    }

    public readField(): number {
        const byte = this.readByte();
        const delta = byte >> 4;
        if (delta === 0) {
            this._field = BufferReader.fromZigZag(this.readVarInt());
        } else {
            this._field += delta;
        }
        return byte & 0x0f;
    }

    public readString = (len: number): string => this.buffer.toString('UTF-8', this.move(len), this._position);

    public readList(size: number, type: number): Array<number | boolean | string> {
        const arr = [];
        switch (type) {
            case ThriftTypes.TRUE:
            case ThriftTypes.FALSE: {
                for (let i = 0; i < size; i++) {
                    arr[i] = this.readSByte() === ThriftTypes.TRUE;
                }
                break;
            }
            case ThriftTypes.BYTE: {
                for (let i = 0; i < size; i++) {
                    arr[i] = this.readSByte();
                }
                break;
            }
            case ThriftTypes.INT_16:
            case ThriftTypes.INT_32:
            case ThriftTypes.INT_64: {
                for (let i = 0; i < size; i++) {
                    arr[i] = BufferReader.fromZigZag(this.readVarInt());
                }
                break;
            }
            case ThriftTypes.BINARY: {
                for (let i = 0; i < size; i++) {
                    arr[i] = this.readString(this.readVarInt());
                }
                break;
            }
        }
        return arr;
    }

    public pushStack() {
        this._stack.push(this.field);
        this._field = 0;
    }

    public popStack() {
        this._field = this._stack.pop()
    }

    public static fromZigZag = (n: number) => (n >> 1) ^ -(n & 1);

}

export class BufferWriter {
    get buffer(): Buffer {
        return this._buffer;
    }

    private _buffer: Buffer;

    private _position: number = 0;
    public get position(): number {
        return this._position;
    };

    public get length(): number {
        return this._buffer.length;
    }

    private _field: number = 0;
    public get field(): number {
        return this._field;
    };

    private _stack: number[] = [];
    public get stack(): number[] {
        return this._stack;
    }

    constructor(buffer: Buffer) {
        this._buffer = buffer;
    }

    public move(bytes: number): number {
        this._position = this._position + bytes;
        return this._position - bytes;
    }

    private writeVarInt(num: number): this {
        while (true) {
            let byte = num & (~0x7f);
            if (byte === 0) {
                this.writeByte(byte);
                break;
            } else if (byte === -128) {
                // -128 = 0b1000_0000 but it's the last an no other bytes will follow
                this.writeByte(0);
                break;
            } else {
                byte = (num & 0xff) | 0x80;
                this.writeByte(byte);
                num = num >> 7;
            }
        }
        return this;
    }

    private writeField(field: number, type: number): this {
        const delta = field - this.field;
        if (delta > 0 && delta <= 15) {
            this.writeByte((delta << 4) | type);
        } else {
            this.writeByte(type);
            this.writeWord(field);
        }
        this._field = field;

        return this;
    }

    private writeByte(byte: number): this {
        this._buffer.writeUInt8(byte, this.move(1));
        return this;
    }

    private writeSByte(byte: number): this {
        this._buffer.writeInt8(byte, this.move(1));
        return this;
    }

    private writeWord(num: number): this {
        return this.writeVarInt(BufferWriter.toZigZag(num, 0x10));
    }

    private writeInt(num: number): this {
        return this.writeVarInt(BufferWriter.toZigZag(num, 0x20));
    }

    private writeLong(num: number): this {
        return this.writeVarInt(BufferWriter.toZigZag(num, 0x40));
    }

    public writeBoolean(field: number, bool: boolean): this {
        return this.writeField(field, bool ? ThriftTypes.TRUE : ThriftTypes.FALSE);
    }

    public writeString(field: number, s: string): this {
        this.writeField(field, ThriftTypes.BINARY);
        this.writeVarInt(s.length);
        this._buffer.write(s, this.move(s.length), s.length, 'utf8');
        return this;
    }

    public writeStop(): this {
        this.writeByte(ThriftTypes.STOP);
        if (this.stack.length > 0) {
            this.popStack();
        }
        return this;
    }

    public writeInt8(field: number, num: number): this {
        this.writeField(field, ThriftTypes.BYTE);
        return this.writeByte(num);
    }

    public writeInt16(field: number, num: number): this {
        this.writeField(field, ThriftTypes.INT_16);
        return this.writeWord(num);
    }

    public writeInt32(field: number, num: number): this {
        this.writeField(field, ThriftTypes.INT_32);
        return this.writeInt(num);
    }

    public writeInt64(field: number, num: number): this {
        this.writeField(field, ThriftTypes.INT_64);
        return this.writeLong(num);
    }

    public writeList(field: number, type: number, list: any[]): this {
        this.writeField(field, ThriftTypes.LIST);
        const size = list.length;

        if (size < 0x0f) {
            this.writeByte((size << 4) | type);
        } else {
            this.writeByte(0xf0 | type);
            this.writeVarInt(size);
        }

        switch (type) {
            case ThriftTypes.TRUE:
            case ThriftTypes.FALSE: {
                list.forEach(el => this.writeByte(el ? ThriftTypes.TRUE : ThriftTypes.FALSE));
                break;
            }
            case ThriftTypes.BYTE: {
                list.forEach(el => this.writeByte(el));
                break;
            }
            case ThriftTypes.INT_16: {
                list.forEach(el => this.writeWord(el));
                break;
            }
            case ThriftTypes.INT_32: {
                list.forEach(el => this.writeInt(el));
                break;
            }
            case ThriftTypes.INT_64: {
                list.forEach(el => this.writeLong(el));
                break;
            }
            case ThriftTypes.BINARY:
            default: {
                throw new Error('not impl');
            }
        }
        return this;
    }

    public writeStruct(field: number): this {
        this.writeField(field, ThriftTypes.STRUCT);
        this.pushStack();
        return this;
    }

    public pushStack() {
        this._stack.push(this.field);
        this._field = 0;
    }

    public popStack() {
        this._field = this._stack.pop()
    }

    public toString() {
        return this._buffer.toString('ascii');
    }

    public static toZigZag = (n: number, bits: number) => (n << 1) ^ (n >> (bits - 1));
}
