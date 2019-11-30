export interface ThriftMessage {
    context: string;
    field: number;
    value;
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

    LIST_INT_16: (0x04 << 8) | 0x09,
    LIST_INT_32: (0x05 << 8) | 0x09,
    LIST_INT_64: (0x06 << 8) | 0x09,
    LIST_BINARY: (0x08 << 8) | 0x09,

    MAP_BINARY_BINARY: (0x88 << 8) | 0x0b,

    // internal!
    BOOLEAN: 0xa1,
};

export function isThriftBoolean(type: number) {
    type &= 0x0f;
    return type === ThriftTypes.TRUE || type === ThriftTypes.FALSE || type === ThriftTypes.BOOLEAN;
}

export interface ThriftPacketDescriptor {
    fieldName: string;
    field: number;
    type: number;
    structDescriptors?: ThriftPacketDescriptor[];
}

export const ThriftDescriptors = {
    boolean: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.BOOLEAN,
    }),
    byte: (fieldName: string, field: number): ThriftPacketDescriptor => ({ field, fieldName, type: ThriftTypes.BYTE }),
    int16: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.INT_16,
    }),
    int32: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.INT_32,
    }),
    int64: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.INT_64,
    }),
    double: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.DOUBLE,
    }),
    binary: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.BINARY,
    }),
    listOfInt16: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.LIST_INT_16,
    }),
    listOfInt32: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.LIST_INT_32,
    }),
    listOfInt64: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.LIST_INT_64,
    }),
    listOfBinary: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.LIST_BINARY,
    }),
    mapBinaryBinary: (fieldName: string, field: number): ThriftPacketDescriptor => ({
        field,
        fieldName,
        type: ThriftTypes.MAP_BINARY_BINARY,
    }),

    struct: (fieldName: string, field: number, descriptors: ThriftPacketDescriptor[]) => ({
        field,
        fieldName,
        type: ThriftTypes.STRUCT,
        structDescriptors: descriptors,
    }),
};

export type Int64 = number | CInt64 | bigint | object;

export function int64ToNumber(i64: Int64): number {
    if (typeof i64 === 'number') return i64;
    if (typeof i64 === 'bigint') return Number(i64);
    if (typeof i64 === 'object') {
        // @ts-ignore
        return i64.toNumber();
    }
    throw new Error('Unknown Int64-type');
}

// this because there are no types for it :(
export interface CInt64 {
    shiftLeft(signedBits: number): CInt64;
    shiftRight(signedBits: number): CInt64;
    xor(other: CInt64): CInt64;
    xor(other: number): CInt64;
    not(other: CInt64): CInt64;
    not(other: number): CInt64;
    and(other: CInt64): CInt64;
    and(other: number): CInt64;
    or(other: CInt64): CInt64;
    or(other: number): CInt64;
    neg(): CInt64;
    eq(other: CInt64): boolean;
    eq(other: number): boolean;
    toNumber(): number;
}
