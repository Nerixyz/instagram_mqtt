import { IgApiClient } from 'instagram-private-api';
import { FBNS, FbnsTopics, INSTAGRAM_PACKAGE_NAME } from '../constants';
import { FbnsDeviceAuth } from './fbns.device-auth';
import { compressDeflate, createUserAgent, notUndefined, unzipAsync } from '../shared';
import { EventEmitter } from 'events';
import { MQTToTConnection } from '../mqttot/mqttot.connection';
import { MQTToTClient } from '../mqttot/mqttot.client';
import { ConnectResponsePacket, IdentifierPacket, PublishRequestPacket } from '../mqtt/packets';
import { Chance } from 'chance';

import * as querystring from 'querystring';

import * as URL from 'url';

const Int64 = require('node-cint64').Int64;

export interface FbnsMessageData {
    token?: string;
    pn?: string;
    nid?: string;
    ck?: string;
    fbpushnotif?: string;
    num_endpoints?: string;
}

export interface FbPushNotif {
    t?: string;
    m?: string;
    tt?: string;
    ig?: string;
    collapse_key?: string;
    i?: string;
    a?: string;
    sound?: string;
    pi?: string;
    c?: string;
    u?: string;
    s?: string;
    igo?: string;
    bc?: string;
    ia?: string;
    it?: string;
    si?: string;
    PushNotifID?: string;
}

export interface FbnsBadgeCount {
    direct?: number;
    ds?: number;
    activities?: number;
}

export interface FbnsNotification {
    original: FbPushNotif;

    title?: string;
    message?: string;
    tickerText?: string;
    igAction?: string;
    igActionOverride?: string;
    optionalImage?: string;
    optionalAvatarUrl?: string;
    collapseKey?: string;
    sound?: string;
    pushId?: string;
    pushCategory?: string;
    intendedRecipientUserId?: string;
    sourceUserId?: string;
    badgeCount?: FbnsBadgeCount;
    inAppActors?: string;
    actionPath?: string;
    actionParams?: { [x: string]: string };
    higherPriorityApps?: string;
}

export declare interface FbnsClient {
    /**
     * See: https://github.com/mgp25/Instagram-API/blob/master/src/Push.php
     * TODO: inspect
     * TODO: add regex?
     * The following events are emitted:
     */

    on(event: 'warning', cb: (e: Error | object) => void);
    // the client can't continue it's work
    on(event: 'error', cb: (e: Error | object) => void);
    // the client is authenticated (state can be saved)
    on(event: 'auth', cb: (e: FbnsDeviceAuth) => void);
    // a notification was received
    on(event: 'push', cb: (e: FbnsNotification) => void);
    // a beacon id gets sent
    on(event: 'exp_logging', cb: (e: { beacon_id: number }) => void);

    // a packet without a notification was received
    on(event: 'message', cb: (e: FbnsMessageData) => void);

    on(event: 'silent_push', cb: (e: FbnsNotification) => void);

    /*
     *  Formatting:
     *  {message},
     *  {igAction = actionPath?actionParams}
     *
     *  Placeholders:
     *  {user}      username
     *  {mediaId}   1111111111111111111_1111111111
     *  {threadId}  11111111111111111111111111111111111111
     *  {id}        11111111111111111
     *  {time}      1234567890
     *  {text}      ANY_TEXT
     *  {date}      FORMATTED_DATE
     */

    // POSTS:
    // ===============================================
    // '{user} just shared a post',
    // media?id={mediaId}
    on(event: 'post', cb: (e: FbnsNotification) => void);
    // 'See {user}'s first post.',
    // user?username={user}
    on(event: 'first_post', cb: (e: FbnsNotification) => void);
    // '{user} posted for the first time in a while. Be the first to add a comment.',
    // media?id={mediaId}
    on(event: 'resurrected_user_post', cb: (e: FbnsNotification) => void);
    // '{user} just shared a post.',
    // media?id={mediaId}
    on(event: 'recent_follow_post', cb: (e: FbnsNotification) => void);
    // 'Your Facebook friend {user} just shared their first Instagram post',
    // user?username={user}
    on(event: 'fb_first_post', cb: (e: FbnsNotification) => void);
    // '{user} just shared a post with their close friends list.'
    // media?id={mediaId}
    // OR: (story)
    // user?username={user}&launch_reel=1
    on(event: 'first_bestie_post', cb: (e: FbnsNotification) => void);

    // STORIES:
    // ============================================
    // 'See {users}'s first story on Instagram
    // user?username={user}&launch_reel=1
    on(event: 'first_reel_post', cb: (e: FbnsNotification) => void);
    on(event: 'resurrected_reel_post', cb: (e: FbnsNotification) => void);

    // first_bestie_post -> POSTS

    on(event: 'story_poll_vote', cb: (e: FbnsNotification) => void);
    on(event: 'story_poll_close', cb: (e: FbnsNotification) => void);
    on(event: 'story_producer_expire_media', cb: (e: FbnsNotification) => void);
    on(event: 'story_poll_result_share', cb: (e: FbnsNotification) => void);
    on(event: 'story_daily_digest', cb: (e: FbnsNotification) => void);

    // ACCOUNTS
    // ===========================================
    on(event: 'new_follower', cb: (e: FbnsNotification) => void);
    on(event: 'private_user_follow_request', cb: (e: FbnsNotification) => void);
    on(event: 'follow_request_approved', cb: (e: FbnsNotification) => void);
    on(event: 'contactjoined', cb: (e: FbnsNotification) => void);
    on(event: 'contact_joined_email', cb: (e: FbnsNotification) => void);
    on(event: 'fb_friend_connected', cb: (e: FbnsNotification) => void);
    on(event: 'follower_follow', cb: (e: FbnsNotification) => void);
    on(event: 'follower_activity_reminders', cb: (e: FbnsNotification) => void);

    // COMMENTS
    // ===========================================
    on(event: 'comment', cb: (e: FbnsNotification) => void);
    on(event: 'mentioned_comment', cb: (e: FbnsNotification) => void);
    on(event: 'comment_on_tag', cb: (e: FbnsNotification) => void);
    on(event: 'comment_subscribed', cb: (e: FbnsNotification) => void);
    on(event: 'comment_subscribed_on_like', cb: (e: FbnsNotification) => void);
    on(event: 'reply_to_comment_with_threading', cb: (e: FbnsNotification) => void);

    // LIKES
    // ===========================================
    on(event: 'like', cb: (e: FbnsNotification) => void);
    on(event: 'like_on_tag', cb: (e: FbnsNotification) => void);
    on(event: 'comment_like', cb: (e: FbnsNotification) => void);

    // DIRECT
    // ===========================================
    on(event: 'direct_v2_message', cb: (e: FbnsNotification) => void);

    // LIVE
    // ===========================================
    on(event: 'live_broadcast', cb: (e: FbnsNotification) => void);
    on(event: 'live_with_broadcast', cb: (e: FbnsNotification) => void);
    on(event: 'live_broadcast_revoke', cb: (e: FbnsNotification) => void);

    // BUSINESS
    // ===========================================
    on(event: 'aymt', cb: (e: FbnsNotification) => void);
    on(event: 'ad_preview', cb: (e: FbnsNotification) => void);
    on(event: 'branded_content_tagged', cb: (e: FbnsNotification) => void);
    on(event: 'business_profile', cb: (e: FbnsNotification) => void);

    // UNSORTED
    // ===========================================
    on(event: 'usertag', cb: (e: FbnsNotification) => void);
    on(event: 'video_view_count', cb: (e: FbnsNotification) => void);
    on(event: 'copyright_video', cb: (e: FbnsNotification) => void);
    on(event: 'report_updated', cb: (e: FbnsNotification) => void);
    on(event: 'promote_account', cb: (e: FbnsNotification) => void);
    on(event: 'unseen_notification_reminders', cb: (e: FbnsNotification) => void);
}

export class FbnsClient extends EventEmitter {
    public get auth(): FbnsDeviceAuth {
        return this._auth;
    }

    public set auth(value: FbnsDeviceAuth) {
        this._auth = value;
    }
    private client: MQTToTClient;
    private readonly ig: IgApiClient;
    private conn: MQTToTConnection;
    private _auth: FbnsDeviceAuth;

    public constructor(ig: IgApiClient) {
        super();
        this.ig = ig;
        this._auth = new FbnsDeviceAuth(this.ig);
        this.buildConnection();
    }

    private emitError = (e: Error | object) => this.emit('error', e);
    private emitWarning = (e: Error | object) => this.emit('warning', e);
    private emitAuth = (e: FbnsDeviceAuth) => this.emit('auth', e);
    private emitPush = (e: FbnsNotification) => this.emit('push', e);
    private emitMessage = (e: FbnsMessageData) => this.emit('message', e);
    private emitLogging = (e: { beacon_id: number }) => this.emit('exp_logging', e);

    private buildConnection() {
        this.conn = new MQTToTConnection({
            clientIdentifier: this._auth.clientId,
            clientInfo: {
                userId: new Int64(this._auth.userId),
                userAgent: createUserAgent(this.ig),
                clientCapabilities: 183,
                endpointCapabilities: 128,
                publishFormat: 1,
                noAutomaticForeground: true,
                makeUserAvailableInForeground: false,
                deviceId: this._auth.deviceId,
                isInitiallyForeground: false,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: Date.now() & 0xffffff,
                subscribeTopics: [76, 80, 231],
                clientType: 'device_auth',
                appId: new Int64(567310203415052),
                deviceSecret: this._auth.deviceSecret,
                anotherUnknown: new Int64(-1),
                clientStack: 3,
            },
            password: this._auth.password,
        });
    }

    public async connect() {
        this.client = new MQTToTClient({
            url: FBNS.HOST_NAME_V6,
            payload: await compressDeflate(this.conn.toThrift()),
        });
        this.client.on('warning', w => this.emitWarning(w));
        this.client.on('error', e => this.emitError(e));
        this.client.on('message', msg => this.handleMessage(msg));
        this.client.on('close', () => this.emitError(new Error('MQTToTClient was closed')));
        this.client.on('disconnect', () => this.emitError(new Error('MQTToTClient got disconnected.')));

        this.client.on('mqttotConnect', async (res: ConnectResponsePacket) => {
            this._auth.read(res.payload.toString('utf8'));
            this.emitAuth(this.auth);
            IdentifierPacket.generateIdentifier();
            await this.client.mqttotPublish({
                topic: FbnsTopics.FBNS_REG_REQ.id,
                payload: Buffer.from(
                    JSON.stringify({
                        pkg_name: INSTAGRAM_PACKAGE_NAME,
                        appid: this.ig.state.fbAnalyticsApplicationId,
                    }),
                    'utf8',
                ),
                qosLevel: 1,
            });
            this.buildConnection();
        });

        this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true,
        });
    }

    private async handleMessage(msg: PublishRequestPacket) {
        switch (msg.topic) {
            case FbnsTopics.FBNS_REG_RESP.id: {
                const data = await unzipAsync(msg.payload);

                const { token, error } = JSON.parse(data.toString('utf8'));
                if (error) {
                    this.emitError(error);
                    return;
                }
                try {
                    await this.sendPushRegister(token);
                } catch (e) {
                    this.emitError(e);
                }
                break;
            }
            case FbnsTopics.FBNS_MESSAGE.id: {
                const payload: FbnsMessageData = JSON.parse((await unzipAsync(msg.payload)).toString('utf8'));

                if (notUndefined(payload.fbpushnotif)) {
                    const notification = FbnsClient.createNotificationFromJson(payload.fbpushnotif);
                    this.emitPush(notification);
                    if (notUndefined(notification.collapseKey)) {
                        this.emit(notification.collapseKey, notification);
                    }
                } else {
                    this.emitWarning(new Error(`Received message without 'fbpushnotif'`));
                    this.emitMessage(JSON.parse((await unzipAsync(msg.payload)).toString('utf8')));
                }
                break;
            }
            case FbnsTopics.FBNS_EXP_LOGGING.id: {
                const payload = JSON.parse((await unzipAsync(msg.payload)).toString('utf8'));
                this.emitLogging(payload);
                break;
            }
            default: {
                this.emitWarning(new Error(`Received unknown packet on ${msg.topic}.`));
            }
        }
    }

    public async sendPushRegister(token: string) {
        const { body } = await this.ig.request.send({
            url: `/api/v1/push/register/`,
            method: 'POST',
            form: {
                device_type: 'android_mqtt',
                is_main_push_channel: true,
                device_sub_type: 2,
                device_token: token,
                _csrftoken: this.ig.state.cookieCsrfToken,
                guid: this.ig.state.uuid,
                uuid: this.ig.state.uuid,
                users: this.ig.state.cookieUserId,
                family_device_id: new Chance().guid({ version: 4 }),
            },
        });
        return body;
    }

    private static createNotificationFromJson(json: string): FbnsNotification {
        const data: FbPushNotif = JSON.parse(json);

        const notification: FbnsNotification = Object.defineProperty({}, 'description', {
            enumerable: false,
            value: data,
        });

        if (notUndefined(data.t)) {
            notification.title = data.t;
        }
        if (notUndefined(data.m)) {
            notification.message = data.m;
        }
        if (notUndefined(data.tt)) {
            notification.tickerText = data.tt;
        }
        if (notUndefined(data.ig)) {
            notification.igAction = data.ig;
            const url = URL.parse(data.ig);
            if (url.pathname) {
                notification.actionPath = url.pathname;
            }
            if (url.query) {
                notification.actionParams = querystring.decode(url.query);
            }
        }
        if (notUndefined(data.collapse_key)) {
            notification.collapseKey = data.collapse_key;
        }
        if (notUndefined(data.i)) {
            notification.optionalImage = data.i;
        }
        if (notUndefined(data.a)) {
            notification.optionalAvatarUrl = data.a;
        }
        if (notUndefined(data.sound)) {
            notification.sound = data.sound;
        }
        if (notUndefined(data.pi)) {
            notification.pushId = data.pi;
        }
        if (notUndefined(data.c)) {
            notification.pushCategory = data.c;
        }
        if (notUndefined(data.u)) {
            notification.intendedRecipientUserId = data.u;
        }
        if (notUndefined(data.s) && data.s !== 'None') {
            notification.sourceUserId = data.s;
        }
        if (notUndefined(data.igo)) {
            notification.igActionOverride = data.igo;
        }
        if (notUndefined(data.bc)) {
            const badgeCount: FbnsBadgeCount = {};
            const parsed = JSON.parse(data.bc);
            if (notUndefined(parsed.di)) {
                badgeCount.direct = parsed.di;
            }
            if (notUndefined(parsed.ds)) {
                badgeCount.ds = parsed.ds;
            }
            if (notUndefined(parsed.ac)) {
                badgeCount.activities = parsed.ac;
            }
            notification.badgeCount = badgeCount;
        }
        if (notUndefined(data.ia)) {
            notification.inAppActors = data.ia;
        }

        return notification;
    }
}
