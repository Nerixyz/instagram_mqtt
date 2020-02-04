import { ConnectRequestOptions } from './packets';
import { MqttParser } from './mqtt.parser';
import { Transport } from './transport';
import { XOR } from 'ts-xor';
import { MqttMessage } from './mqtt.message';

export type MqttClientConstructorOptions = XOR<
    { transport: Transport<unknown> },
    { url: string; enableTrace?: boolean }
> & { parser?: MqttParser };

export interface MqttSubscription {
    topic: string;
    qosLevel?: number;
}

export type RegisterClientOptions = ConnectRequestOptions;

export type ExecuteNextTick = (action: () => void) => void;
export type ExecutePeriodically = (timeInMs: number, action: () => void) => object;
export type ExecuteDelayed = (timeInMs: number, action: () => void) => object;
export type StopExecuting = (ref: any) => void;

export type AsyncLike<TIn, TOut> = (data: TIn) => TOut | PromiseLike<TOut>;

export interface ListenerInfo<TIn, TOut> {
    eventName: string;
    validator: (data: TIn) => boolean | PromiseLike<boolean>;
    transformer?: (data: TIn) => TOut | PromiseLike<TOut>;
    onData: (data: TOut) => void | PromiseLike<void>;
}

export interface ListenOptions<TOut> {
    topic: string;
    validator?: null | ((data: MqttMessage) => boolean);
    transformer?: (data: MqttMessage) => TOut;
}
