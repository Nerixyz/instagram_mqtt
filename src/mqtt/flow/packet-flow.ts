import { MqttPacket } from '../mqtt.packet';

export abstract class PacketFlow<T> {
    private _finished: boolean = false;
    private _success: boolean = false;
    private _result: T;
    private _error: string;
    protected _silent: boolean = false;

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
    public abstract get name(): string;

    public abstract start(): MqttPacket;
    public abstract accept(packet: MqttPacket): boolean;
    public abstract next(packet: MqttPacket): MqttPacket;

    protected succeeded(result: T): void {
        this._finished = true;
        this._success = true;
        this._result = result;
    }

    protected errored(error: string = ''): void {
        this._finished = true;
        this._success = false;
        this._error = error;
    }
}
