import { IrisParserData } from '../parsers/iris.parser';
import { BigInteger } from '../../shared';

export interface MessageSyncMessageWrapper extends Partial<IrisParserData> {
    message: MessageSyncMessage;
}

export interface MessageSyncMessage {
    thread_id: string;
    op: 'add' | 'replace' | string;
    path: string;
    item_id: string;
    user_id: BigInteger;
    timestamp: BigInteger;
    item_type: 'text' | 'media' | 'raven_media' | 'voice_media' | 'animated_media' | string;
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
}

export interface ImageVersions {
    candidates: {
        width: number;
        height: number;
        url: string;
        estimated_scan_sizes?: number[];
    }[];
}

export interface RegularMediaItem {
    id: string;
    image_versions2: ImageVersions;
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
