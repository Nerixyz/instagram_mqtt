import { MqttPacket } from '../mqtt.packet';

export abstract class PacketFlow<T> {
    private _finished = false;
    private _success = false;
    private _result: T;
    private _error: string;
    protected _silent = false;
    protected _promise: Promise<T>;
    protected _resolve: (value: T) => void;
    protected _reject: (error: Error | string) => void;

    public get silent(): boolean {
        return this._silent;
    }
    public get error(): string {
        return this._error;
    }
    public get success(): boolean {
        return this._success;
    }
    public get finished(): boolean {
        return this._finished;
    }
    public get result(): T {
        return this._result;
    }
    public get promise(): Promise<T> {
        return this._promise;
    }
    public abstract get name(): string;

    public constructor() {
        this._promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
    }

    public abstract start(): MqttPacket | undefined;
    public abstract accept(packet: MqttPacket): boolean;
    public abstract next(packet: MqttPacket): MqttPacket | undefined | null;

    protected succeeded(result: T): void {
        this._finished = true;
        this._success = true;
        this._result = result;
        this._resolve(result);
    }

    protected errored(error = ''): void {
        this._finished = true;
        this._success = false;
        this._error = error;
        this._reject(error);
    }
}
