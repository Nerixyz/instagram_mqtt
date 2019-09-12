import {MqttPacket} from "../mqtt.packet";

export abstract class PacketFlow<T> {
    get silent(): boolean {
        return this._silent;
    }

    get error(): string {
        return this._error;
    }
    get success(): boolean {
        return this._success;
    }
    get finished(): boolean {
        return this._finished;
    }
    get result(): T {
        return this._result;
    }
    abstract get name(): string;

    private _finished: boolean = false;
    private _success: boolean = false;
    private _result: T;
    private _error: string;
    protected _silent: boolean = false;

    abstract start(): MqttPacket;
    abstract accept(packet: MqttPacket): boolean;
    abstract next(packet: MqttPacket): MqttPacket;

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
