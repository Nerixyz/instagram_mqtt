export abstract class Transport<T> {
    /**
     * This will be set by the MqttClient
     */
    public callbacks: TransportConnectOptions;
    public constructor(protected options: T) {}

    public abstract connect(): void;

    public abstract send(data: Buffer): void;
}

export interface TransportConnectOptions {
    disconnect(data?: Error): void;
    connect(): void;
    data(data: Buffer): void;
    error(e: Error): void;
}
