import { IgApiClient } from 'instagram-private-api';
import { FBNS, FbnsTopics, INSTAGRAM_PACKAGE_NAME } from '../constants';
import { FbnsDeviceAuth } from './fbns.device-auth';
import { compressDeflate, createUserAgent, debugChannel, notUndefined, unzipAsync } from '../shared';
import { MQTToTConnection, MQTToTClient } from '../mqttot';
import { ConnectResponsePacket, IdentifierPacket, PublishRequestPacket } from '../mqtt/packets';
import { Chance } from 'chance';
import * as querystring from 'querystring';
import * as URL from 'url';
import { Subject } from 'rxjs';
import { FbnsBadgeCount, FbnsMessageData, FbnsNotificationUnknown, FbPushNotif } from './fbns.types';

export class FbnsClient {
    public get auth(): FbnsDeviceAuth {
        return this._auth;
    }

    public set auth(value: FbnsDeviceAuth) {
        this._auth = value;
    }
    private fbnsDebug = debugChannel('fbns');
    private client: MQTToTClient;
    private conn: MQTToTConnection;
    private _auth: FbnsDeviceAuth;
    private connectPromiseInfo: null | { resolve: () => void; reject: (error: Error) => void } = null;
    private safeDisconnect = false;

    // general push
    push$ = new Subject<FbnsNotificationUnknown>();
    error$ = new Subject<Error>();
    warning$ = new Subject<Error>();
    auth$ = new Subject<FbnsDeviceAuth>();
    // message without fbpushnotif
    message$ = new Subject<FbnsMessageData>();
    logging$ = new Subject<{ beacon_id: number }>();
    pp$ = new Subject<string>();
    disconnect$ = new Subject<void>();

    public constructor(private readonly ig: IgApiClient) {
        this._auth = new FbnsDeviceAuth(this.ig);
    }

    public buildConnection() {
        this.fbnsDebug('Constructing connection');
        this.conn = new MQTToTConnection({
            clientIdentifier: this._auth.clientId,
            clientInfo: {
                userId: BigInt(this._auth.userId),
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
                clientMqttSessionId: BigInt(Date.now()) & BigInt(0xffffffff),
                subscribeTopics: [76, 80, 231],
                clientType: 'device_auth',
                appId: BigInt(567310203415052),
                deviceSecret: this._auth.deviceSecret,
                anotherUnknown: BigInt(-1),
                clientStack: 3,
            },
            password: this._auth.password,
        });
    }

    public async connect({ enableTrace }: { enableTrace?: boolean } = {}): Promise<void> {
        this.fbnsDebug('Connecting to FBNS...');
        this.auth.update();
        this.buildConnection();
        this.client = new MQTToTClient({
            url: FBNS.HOST_NAME_V6,
            payload: await compressDeflate(this.conn.toThrift()),
        });
        this.client.on('warning', w => this.warning$.next(w));
        this.client.on('error', e => this.error$.next(e));
        this.client.on('message', msg => this.handleMessage(msg));
        this.client.on('close', () => this.error$.next(new Error('MQTToTClient was closed')));
        this.client.on('disconnect', () =>
            this.safeDisconnect
                ? this.disconnect$.next()
                : this.error$.next(new Error('MQTToTClient got disconnected.')),
        );

        this.client.on('mqttotConnect', async (res: ConnectResponsePacket) => {
            this.fbnsDebug('Connected to MQTT');
            const payload = res.payload.toString('utf8');
            if (payload.length === 0) {
                this.fbnsDebug('Received empty connect packet.');
                this.error$.next(new Error('Received empty connect packet'));
                this.connectPromiseInfo?.reject(new Error('Empty auth packet.'));
                return;
            }
            this.fbnsDebug(`Received auth: ${payload}`);
            this._auth.read(payload);
            this.auth$.next(this.auth);
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
            // this.buildConnection(); ?
        });

        await this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true,
            enableTrace,
        });
        return await new Promise((resolve, reject) => (this.connectPromiseInfo = { resolve, reject }));
    }

    public disconnect() {
        this.safeDisconnect = true;
        return this.client.disconnect();
    }

    private async handleMessage(msg: PublishRequestPacket) {
        switch (msg.topic) {
            case FbnsTopics.FBNS_REG_RESP.id: {
                const data = await unzipAsync(msg.payload);
                const payload = data.toString('utf8');
                this.fbnsDebug(`Received register response: ${payload}`);

                const { token, error } = JSON.parse(payload);
                if (error) {
                    this.error$.next(error);
                    this.connectPromiseInfo?.reject(error);
                    return;
                }
                try {
                    await this.sendPushRegister(token);
                    this.connectPromiseInfo?.resolve();
                } catch (e) {
                    this.error$.next(e);
                    this.connectPromiseInfo?.reject(e);
                }
                break;
            }
            case FbnsTopics.FBNS_MESSAGE.id: {
                const payload: FbnsMessageData = JSON.parse((await unzipAsync(msg.payload)).toString('utf8'));

                if (notUndefined(payload.fbpushnotif)) {
                    const notification = FbnsClient.createNotificationFromJson(payload.fbpushnotif);
                    this.push$.next(notification);
                } else {
                    this.fbnsDebug(`Received a message without 'fbpushnotif': ${JSON.stringify(payload)}`);
                    this.message$.next(JSON.parse((await unzipAsync(msg.payload)).toString('utf8')));
                }
                break;
            }
            case FbnsTopics.FBNS_EXP_LOGGING.id: {
                const payload = JSON.parse((await unzipAsync(msg.payload)).toString('utf8'));
                this.logging$.next(payload);
                break;
            }
            case FbnsTopics.PP.id: {
                const payload = msg.payload.toString('utf8');
                this.pp$.next(payload);
                break;
            }
            default: {
                this.fbnsDebug(`Received unknown packet on ${msg.topic}: ${msg.payload.toString('base64')}`);
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

    private static createNotificationFromJson(json: string): FbnsNotificationUnknown {
        const data: FbPushNotif = JSON.parse(json);

        const notification: FbnsNotificationUnknown = Object.defineProperty({}, 'description', {
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
