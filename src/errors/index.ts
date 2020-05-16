class BaseError extends Error {
    constructor(message?: string) {
        super(message);
        // @ts-ignore -- set the name to the class's actual name
        this.name = this.__proto__.constructor.name;
    }
}

export class ClientDisconnectedError extends BaseError {}

export class EmptyPacketError extends BaseError {}

export class InvalidStateError extends BaseError {}

export class ConnectionFailedError extends BaseError {}

export class IllegalArgumentError extends BaseError {}

// TODO: split further
export class ThriftError extends BaseError {}
