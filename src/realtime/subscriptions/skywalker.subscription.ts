export class SkywalkerSubscriptions {
    public static directSub(userId: string | number | bigint) {
        return `ig/u/v1/${userId}`;
    }
    public static liveSub(userId: string | number | bigint) {
        return `ig/live_notification_subscribe/${userId}`;
    }
}
