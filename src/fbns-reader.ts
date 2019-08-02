export function fbnsRead(message: Buffer) {
    const reader = new BufferReader(message);
    const messages: FbnsMessage[] = [];

    let context = '';
    let position = 0;
    while (position < message.length) {
        const type = reader.readField();
        switch (type) {
            case FbnsTypes.STOP: {
                if(reader.stack.length === 0){
                    return messages;
                }
                reader.popStack();
                context = reader.stack.join('/');
                break;
            }
            case FbnsTypes.TRUE:
            case FbnsTypes.FALSE: {
                messages.push({
                    context,
                    field: reader.field,
                    value: type === FbnsTypes.TRUE,
                    type,
                });
                break;
            }
            case FbnsTypes.BYTE: {
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readSByte(),
                    type,
                });
                break;
            }
            case FbnsTypes.INT_16:
            case FbnsTypes.INT_32:
            case FbnsTypes.INT_64: {
                messages.push({
                    context,
                    field: reader.field,
                    value: BufferReader.fromZigZag(reader.readVarInt()),
                    type,
                });
                break;
            }
            case FbnsTypes.BINARY: {
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readString(reader.readVarInt()),
                    type,
                });
                break;
            }
            case FbnsTypes.LIST: {
                const byte = reader.readByte();
                let size = byte >> 4;
                const listType = byte & 0x0f;
                if(size === 0x0f)
                    size = reader.readVarInt();
                messages.push({
                    context,
                    field: reader.field,
                    value: reader.readList(size, listType),
                    type: (listType << 8) | type,
                });
                break;
            }
            case FbnsTypes.STRUCT: {
                reader.pushStack();
                context = reader.stack.join('/');
                break;
            }

        }
    }
    return messages;
}

export interface FbnsMessage {
    context: string;
    field: number;
    value: any;
    /* see  FbnsTypes*/
    type: number;
}

export const FbnsTypes =  {
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
        while(this._position < this.length){
            const byte = this.readByte();
            result |= (byte & 0x7f) << shift;
            if((byte & 0x80) == 0){
                break;
            }
            shift += 7;
        }
        return result;
    }
    public readField(): number {
        const byte = this.readByte();
        const delta = byte >> 4;
        if(delta === 0) {
            this._field = BufferReader.fromZigZag(this.readVarInt());
        }else {
            this._field += delta;
        }
        return byte & 0x0f;
    }
    public readString = (len: number): string => this.buffer.toString('UTF-8', this.move(len), this._position);
    public readList(size: number, type: number): Array<number | boolean | string> {
        const arr = [];
        switch (type) {
            case FbnsTypes.TRUE:
            case FbnsTypes.FALSE: {
                for(let i = 0; i < size; i++){
                    arr[i] = this.readSByte() === FbnsTypes.TRUE;
                }
                break;
            }
            case FbnsTypes.BYTE: {
                for(let i = 0; i < size; i++){
                    arr[i] = this.readSByte();
                }
                break;
            }
            case FbnsTypes.INT_16:
            case FbnsTypes.INT_32:
            case FbnsTypes.INT_64: {
                for(let i = 0; i < size; i++){
                    arr[i] = BufferReader.fromZigZag(this.readVarInt());
                }
                break;
            }
            case FbnsTypes.BINARY: {
                for(let i = 0; i < size; i++){
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
