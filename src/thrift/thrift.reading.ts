import { ThriftMessage, ThriftPacketDescriptor, ThriftTypes, isThriftBoolean } from './thrift';
import { InvalidStateError, ThriftError } from '../errors';

export function thriftRead(message: Buffer): ThriftMessage[] {
    const reader = new BufferReader(message);
    const messages: ThriftMessage[] = [];

    let context = '';
    const position = 0;
    while (position < message.length) {
        const type = reader.readField();
        if (type === ThriftTypes.STOP) {
            if (reader.stack.length === 0) {
                return messages;
            }
            reader.popStack();
            context = reader.stack.join('/');
            continue;
        } else if (type === ThriftTypes.STRUCT) {
            reader.pushStack();
            context = reader.stack.join('/');
            continue;
        }

        messages.push(getReadFunction(type)({ reader, context }));
    }
    return messages;
}

function getReadFunction(
    type: number,
): ({ reader, context }: { reader: BufferReader; context: string }) => ThriftMessage {
    switch (type) {
        case ThriftTypes.STRUCT:
        case ThriftTypes.STOP: {
            throw new InvalidStateError(`Invalid state: got type ${type}`);
        }
        case ThriftTypes.TRUE:
        case ThriftTypes.FALSE:
            return ({ reader, context }): ThriftMessage => ({
                context,
                field: reader.field,
                value: type === ThriftTypes.TRUE,
                type,
            });
        case ThriftTypes.BYTE:
            return ({ reader, context }): ThriftMessage => ({
                context,
                field: reader.field,
                value: reader.readSByte(),
                type,
            });
        case ThriftTypes.INT_16:
        case ThriftTypes.INT_32:
            return ({ reader, context }): ThriftMessage => ({
                context,
                field: reader.field,
                value: reader.readSmallInt(),
                type,
            });
        case ThriftTypes.INT_64:
            return ({ reader, context }): ThriftMessage => ({
                context,
                field: reader.field,
                value: reader.readBigint(),
                type,
            });
        case ThriftTypes.BINARY:
            return ({ reader, context }): ThriftMessage => ({
                context,
                field: reader.field,
                value: reader.readString(reader.readVarInt()),
                type,
            });
        case ThriftTypes.SET:
        case ThriftTypes.LIST:
            return ({ reader, context }): ThriftMessage => {
                const byte = reader.readByte();
                let size = byte >> 4;
                const listType = byte & 0x0f;
                if (size === 0x0f) size = reader.readVarInt();
                return {
                    context,
                    field: reader.field,
                    value: reader.readList(size, listType),
                    type: (listType << 8) | type,
                };
            };
        case ThriftTypes.MAP:
            return ({ reader, context }: { reader: BufferReader; context: string }): ThriftMessage => {
                const size = reader.readVarInt();
                const kvType = size ? reader.readByte() : 0;
                const keyType = (kvType & 0xf0) >> 4;
                const valueType = kvType & 0x0f;

                if (size && keyType && valueType) {
                    const keyFunc = getReadFunction(keyType);
                    const valueFunc = getReadFunction(valueType);

                    const entries: { key: any; value: any }[] = [];

                    for (let i = 0; i < size; i++) {
                        entries.push({
                            key: keyFunc({ reader, context }),
                            value: valueFunc({ reader, context }),
                        });
                    }

                    return {
                        context,
                        field: reader.field,
                        value: entries,
                        type: (kvType << 8) | type,
                    };
                }
                return {
                    context,
                    field: reader.field,
                    value: [],
                    type: (kvType << 8) | type,
                };
            };
        default: {
            throw new ThriftError(`Unknown type: ${type}`);
        }
    }
}

export type ThriftToObjectResult<T> = Partial<T> & { otherFindings?: (ThriftMessage | ThriftToObjectStruct)[] };

export interface ThriftToObjectStruct {
    fieldPath: number[];
    items: ThriftMessage[];
}

export function thriftReadToObject<T extends Record<string, any>>(message: Buffer, descriptors: ThriftPacketDescriptor[]): ThriftToObjectResult<T> {
    const readResult = thriftRead(message);
    const topLevel = readResult.filter(x => x.context.length === 0);
    const result = thriftReadSingleLevel(topLevel, descriptors) as ThriftToObjectResult<T>;
    const structs: ThriftToObjectStruct[] = [];

    for (const readData of readResult) {
        if (readData.context.length === 0) continue;

        const fieldPath = readData.context.split('/').map(c => Number(c));
        const possible = structs.findIndex(s => equalArrays(s.fieldPath, fieldPath));
        if (possible !== -1) {
            structs[possible].items.push(readData);
        } else {
            structs.push({ fieldPath, items: [readData] });
        }
    }
    for (const struct of structs) {
        let descriptor: ThriftPacketDescriptor | undefined;
        for (const level of struct.fieldPath) {
            if (descriptor) {
                descriptor = descriptor.structDescriptors?.find(x => x.field === level);
            } else {
                descriptor = descriptors.find(x => x.field === level);
            }

            if (!descriptor) break;
        }
        if (descriptor) {
            defineEnumerableProperty(
                result,
                descriptor.fieldName,
                thriftReadSingleLevel(struct.items, descriptor.structDescriptors ?? []),
            );
        } else {
            if (result.otherFindings) result.otherFindings.push(struct);
            else result.otherFindings = [struct];
        }
    }
    return result;
}

function thriftReadSingleLevel(readResults: ThriftMessage[], descriptors: ThriftPacketDescriptor[]): Record<string, any> {
    const result = {};
    const otherFindings = [];

    for (const message of readResults) {
        const descriptor = descriptors.find(
            d =>
                d.field === message.field &&
                (d.type === message.type || (isThriftBoolean(message.type) && isThriftBoolean(d.type))),
        );
        if (descriptor) {
            // special checks for maps
            if (descriptor.type === ThriftTypes.MAP_BINARY_BINARY) {
                const res = {};
                for (const pair of message.value) {
                    defineEnumerableProperty(res, pair.key.value, pair.value.value);
                }
                defineEnumerableProperty(result, descriptor.fieldName, res);
                continue;
            }
            defineEnumerableProperty(result, descriptor.fieldName, message.value);
        } else {
            otherFindings.push(message);
        }
    }

    return otherFindings.length > 0
        ? {
              ...result,
              otherFindings,
          }
        : result;
}

const defineEnumerableProperty = (object: any, name: string, value: any) =>
    Object.defineProperty(object, name, { value, enumerable: true });

export class BufferReader {
    private buffer: Buffer;

    private _stack: number[] = [];
    public get stack(): number[] {
        return this._stack;
    }

    private _position = 0;
    public get position(): number {
        return this._position;
    }

    public get length(): number {
        return this.buffer.length;
    }

    private _field = 0;
    public get field(): number {
        return this._field;
    }

    public readInt16 = this.readSmallInt;
    public readInt32 = this.readSmallInt;

    public constructor(buffer: Buffer) {
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
            if ((byte & 0x80) === 0) {
                break;
            }
            shift += 7;
        }
        return result;
    }

    public readVarBigint(): bigint {
        let shift = BigInt(0);
        let result = BigInt(0);
        while (true) {
            const byte = this.readByte();
            result = result | ((BigInt(byte) & BigInt(0x7f)) << shift);
            if ((byte & 0x80) !== 0x80) break;

            shift += BigInt(7);
        }
        return result;
    }

    public zigzagToBigint(n: bigint): bigint {
        return (n >> BigInt(1)) ^ -(n & BigInt(1));
    }

    public readBigint(): { int: bigint; num: number } {
        const result = this.zigzagToBigint(this.readVarBigint());
        return { int: result, num: Number(result) };
    }

    public readSmallInt(): number {
        return BufferReader.fromZigZag(this.readVarInt());
    }

    public readField(): number {
        const byte = this.readByte();
        if (byte === 0) {
            return ThriftTypes.STOP;
        }
        const delta = (byte & 0xf0) >> 4;
        if (delta === 0) {
            this._field = BufferReader.fromZigZag(this.readVarInt());
        } else {
            this._field += delta;
        }
        return byte & 0x0f;
    }

    public readString = (len: number): string => this.buffer.toString('utf8', this.move(len), this._position);

    public readList(size: number, type: number): (number | boolean | string)[] {
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
            default: {
                throw new ThriftError(`Type ${type} not impl.`);
            }
        }
        return arr;
    }

    public pushStack() {
        this._stack.push(this.field);
        this._field = 0;
    }

    public popStack() {
        this._field = this._stack.pop() ?? -1;
    }

    public static fromZigZag = (n: number) => (n >> 1) ^ -(n & 1);
}

function equalArrays<T>(left: T[], right: T[]): boolean {
    if (!left || !right || left.length !== right.length) return false;

    for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return false;
    return true;
}
