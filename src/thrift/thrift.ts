export interface ThriftMessage {
    context: string;
    field: number;
    value: any;
    /* see  FbnsTypes*/
    type: number;
}

export type ThriftSerializable =
    | string
    | number
    | boolean
    | bigint
    | Array<ThriftSerializable>
    | { [x: string]: ThriftSerializable }
    | Record<string, any>;

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

export type Int64 = number | bigint;

export function int64ToNumber(i64: Int64): number {
    if (typeof i64 === 'number') return i64;
    return Number(i64);
}
