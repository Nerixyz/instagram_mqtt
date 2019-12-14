export interface RealtimeSubDirectDataWrapper {
    op: string;
    path: string;
    value: string | RealtimeSubDirectData;
}

export interface RealtimeSubDirectData {
    timestamp: string;
    sender_id: string;
    ttl: number;
    activity_status: number;
}
