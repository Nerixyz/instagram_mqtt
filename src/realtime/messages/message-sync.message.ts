import { IrisParserData } from '../parsers';
import { BigInteger } from '../../shared';

export interface MessageSyncMessageWrapper extends Partial<IrisParserData> {
    message: MessageSyncMessage;
}

export type MessageSyncMessageType =
    'text'
    | 'media'
    | 'raven_media'
    | 'voice_media'
    | 'animated_media'
    | 'media_share'
    | string;

export interface MessageSyncMessage {
    thread_id: string;
    op: 'add' | 'replace' | string;
    path: string;
    item_id: string;
    user_id: BigInteger;
    timestamp: BigInteger;
    item_type: MessageSyncMessageType;
    // specific (nullable)
    text?: string;
    media?: RegularMediaItem;
    voice_media?: VoiceMediaItem;
    reactions?: {
        likes: {
            sender_id: BigInteger;
            // not actually a user id but the type fits
            timestamp: BigInteger;
            client_context: string;
        }[];
        likes_count: number;
    };
    animated_media?: AnimatedMediaItem;
    visual_media?: VisualMedia;
    media_share?: MediaShareItem;
}

export interface ImageVersions {
    candidates: {
        width: number;
        height: number;
        url: string;
        estimated_scan_sizes?: number[];
    }[];
}

export interface VideoVersions {
    type: number;
    width: number;
    height: number;
    url: string;
    id: string;
}

export interface RegularMediaItem {
    id: string;
    image_versions2?: ImageVersions;
    video_versions?: VideoVersions[];
    original_width: number;
    original_height: number;
    media_type: number;
    media_id?: BigInteger;
    organic_tracking_token?: string;
    creative_config?: {
        capture_type: 'rich-text' | string;
        camera_facing: 'front' | 'back' | string;
        should_render_try_it_on: boolean;
    };
    create_mode_attribution?: {
        type: 'TYPE' | string;
        name: 'Type' | string;
    };
}

export interface MediaShareItem {
    taken_at: number;
    pk: number;
    id: string;
    device_timestamp: number;
    media_type: number;
    code: string;
    client_cache_key: string;
    filter_type: number;
    image_versions2: ImageVersions;
    video_versions: VideoVersions;
    original_width: number;
    original_height: number;
    user: User;
    can_viewer_reshare: boolean;
    caption_is_edited: boolean;
    comment_likes_enabled: boolean;
    comment_threading_enabled: boolean;
    has_more_comments: boolean;
    max_num_visible_preview_comments: number;
    can_view_more_preview_comments: boolean;
    comment_count: number;
    like_count: number;
    has_liked: boolean;
    photo_of_you: boolean;
    caption: Caption;
    can_viewer_save: boolean;
    organic_tracking_token: string;
}

export interface Caption {
    pk: number;
    user_id: number;
    text: string;
    type: number;
    created_at: number;
    created_at_utc: number;
    content_type: string;
    status: string;
    bit_flags: number;
    user: User;
    did_report_as_spam: boolean;
    share_enabled: boolean;
    media_id: number;
}

export interface User {
    pk: number;
    username: string;
    full_name: string;
    is_private: boolean;
    profile_pic_url: string;
    profile_pic_id: string;
    friendship_status: FriendshipStatus;
    has_anonymous_profile_picture: boolean;
    is_unpublished: boolean;
    is_favorite: boolean;
    latest_reel_media: number;
}

export interface FriendshipStatus {
    following: boolean;
    outgoing_request: boolean;
    is_bestie: boolean;
    is_restricted: boolean;
}

export interface VisualMedia extends ReplayableMediaItem {
    url_expire_at_secs: BigInteger;
    playback_duration_secs: number;
    media: RegularMediaItem;
}

export interface ReplayableMediaItem {
    seen_user_ids: BigInteger[];
    view_mode: 'once' | 'replayable' | 'permanent';
    seen_count: number;
    replay_expiring_at_us: null | any;
}

export interface AnimatedMediaItem {
    id: string;
    images: {
        fixed_height?: {
            height: string;
            mp4: string;
            mp4_size: string;
            size: string;
            url: string;
            webp: string;
            webp_size: string;
            width: string;
        };
    };
    is_random: boolean;
    is_sticker: boolean;
}

export interface VoiceMediaItem extends ReplayableMediaItem {
    media: {
        id: string;
        media_type: 11 | number;
        product_type: 'direct_audio' | string;
        audio: {
            audio_src: string;
            duration: number;
            waveform_data: number[];
            waveform_sampling_frequency_hz: number;
        };
        organic_tracking_token: string;
        user: { pk: BigInteger; username: string };
    };
}
