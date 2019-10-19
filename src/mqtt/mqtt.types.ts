import { ConnectRequestOptions } from './packets/connect.request.packet';
import { MqttParser } from './mqtt.parser';

export interface MqttClientConstructorOptions {
    url: string;
    parser?: MqttParser;
}

export interface MqttSubscription {
    topic: string;
    qosLevel?: number;
}

export type RegisterClientOptions = ConnectRequestOptions;

export type ExecuteNextTick = (action: () => void) => void;
export type ExecutePeriodically = (timeInMs: number, action: () => void) => object;
export type ExecuteDelayed = (timeInMs: number, action: () => void) => object;
export type StopExecuting = (ref) => void;
