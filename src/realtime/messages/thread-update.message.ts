import { MessageSyncMessage, User } from './message-sync.message';
import { IrisParserData } from '../parsers';

export interface ThreadUpdateWrapper extends Partial<IrisParserData> {
    update?: ThreadUpdate;
    meta: ThreadUpdateMeta;
}

export interface ThreadUpdateMeta {
    path: string;
    op: string;
    thread_id?: string;
}

export interface ThreadUpdate {
    thread_id?: string;
    thread_v2_id: string;
    users: User[];
    left_users: User[];
    admin_user_ids: number[];
    items: Partial<MessageSyncMessage>[];
    last_activity_at: number | 0;
    muted: boolean;
    is_pin: boolean;
    named: boolean;
    canonical: boolean;
    pending: boolean,
    archived: boolean;
    thread_type: 'private' | string;
    viewer_id: number;
    thread_title: string;
    folder: number;
    vc_muted: boolean;
    is_group?: boolean;
    mentions_muted: boolean;
    approval_required_for_new_members: boolean;
    input_mode: number;
    business_thread_folder: number;
    read_state: number
    last_mon_sender_item_at: number;
    assigned_admin_id: number;
    shh_mode_enabled: boolean;
    inviter: InviterUser;
    has_older: boolean;
    has_newer: boolean;
    last_seen_at?: Record<number, { timestamp: string, created: string, item_id: string, shh_seen_state: unknown }>;
    newest_cursor?: string;
    oldest_cursor?: string;
    next_cursor: string;
    prev_cursor?: string;
    is_spam: boolean;
    last_permanent_item?: Partial<MessageSyncMessage>;
}


export interface InviterUser {
    pk: number;
    username: string;
    full_name: string;
    is_private: boolean;
    profile_pic_url: string;
    profile_pic_id: string;
    is_verified: boolean;
    has_anonymous_profile_picture: boolean;
    reel_auto_archive: string;
    allowed_commenter_type: string;
    account_badges: unknown[];
}
