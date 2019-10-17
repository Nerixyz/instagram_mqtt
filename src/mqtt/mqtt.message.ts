export interface  MqttMessage {
    topic: string;
    payload: Buffer;
    retained?: boolean;
    duplicate?: boolean;
    qosLevel?: number;
}
