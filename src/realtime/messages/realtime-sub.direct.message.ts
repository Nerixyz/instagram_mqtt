export interface RealtimeSubDirectMessage {
    event: string;
    data: RealtimeSubDirectMessageData[];
}

export interface RealtimeSubDirectMessageData {
    op: string;
    path: string;
    value: string | RealtimeSubDirectMessageDataMessage;
}

export interface RealtimeSubDirectMessageDataMessage {
    timestamp: string;
    sender: string;
    ttl: number;
    activity_status: number;
}
