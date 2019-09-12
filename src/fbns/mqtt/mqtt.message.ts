export interface  MqttMessage {
    topic: string;
    payload: string;
    retained?: boolean;
    duplicate?: boolean;
    qosLevel?: number;
}
