import { IgApiClient, StatusResponse } from 'instagram-private-api';
import { FBNS, FbnsTopics, INSTAGRAM_PACKAGE_NAME } from '../constants';
import { FbnsDeviceAuth } from './fbns.device-auth';
import {
    compressDeflate,
    createFbnsUserAgent,
    debugChannel,
    listenOnce,
    notUndefined,
    ToEventFn,
    tryUnzipAsync,
} from '../shared';
import { MQTToTConnection, MQTToTClient, MQTToTConnectResponsePacket } from '../mqttot';
import { Chance } from 'chance';
import { FbnsMessageData, FbnsNotificationUnknown } from './fbns.types';
import { MqttMessage } from 'mqtts';
import { ClientDisconnectedError, EmptyPacketError } from '../errors';
import EventEmitter = require('eventemitter3');
import { FbnsClientEvents } from './fbns.client.events';
import { createNotificationFromJson } from './fbns.utilities';
import { SocksProxy } from 'socks';
import { ConnectionOptions } from 'tls';

export class FbnsClient extends EventEmitter<ToEventFn<FbnsClientEvents & { [x: string]: FbnsNotificationUnknown }>> {
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
    private safeDisconnect = false;

    public constructor(private readonly ig: IgApiClient) {
        super();
        this._auth = new FbnsDeviceAuth(this.ig);
    }

    public buildConnection(): void {
        this.fbnsDebug('Constructing connection');
        this.conn = new MQTToTConnection({
            clientIdentifier: this._auth.clientId,
            clientInfo: {
                userId: BigInt(this._auth.userId),
                userAgent: createFbnsUserAgent(this.ig),
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

    public async connect({
        enableTrace,
        autoReconnect,
        socksOptions,
        additionalTlsOptions,
    }: {
        enableTrace?: boolean;
        autoReconnect?: boolean;
        socksOptions?: SocksProxy;
        additionalTlsOptions?: ConnectionOptions;
    } = {}): Promise<any> {
        this.fbnsDebug('Connecting to FBNS...');
        this.auth.update();
        this.client = new MQTToTClient({
            url: FBNS.HOST_NAME_V6,
            payloadProvider: () => {
                this.buildConnection();
                return compressDeflate(this.conn.toThrift());
            },
            enableTrace,
            autoReconnect: autoReconnect ?? true,
            requirePayload: true,
            socksOptions,
            additionalOptions: additionalTlsOptions,
        });
        this.client.on('warning', w => this.emit('warning', w));
        this.client.on('error', e => this.emit('error', e));
        this.client.on('disconnect', reason =>
            this.safeDisconnect
                ? this.emit('disconnect', reason && JSON.stringify(reason))
                : this.emit('error', new ClientDisconnectedError(`MQTToTClient got disconnected. Reason: ${reason && JSON.stringify(reason)}`)),
        );
        this.client.listen<MqttMessage>(FbnsTopics.FBNS_MESSAGE.id, msg => this.handleMessage(msg));
        this.client.listen(
            {
                topic: FbnsTopics.FBNS_EXP_LOGGING.id,
                transformer: async msg => JSON.parse((await tryUnzipAsync(msg.payload)).toString()),
            },
            msg => this.emit('logging', msg),
        );
        this.client.listen<MqttMessage>(FbnsTopics.PP.id, msg => this.emit('pp', msg.payload.toString()));

        this.client.on('connect', async (res: MQTToTConnectResponsePacket) => {
            this.fbnsDebug('Connected to MQTT');
            if (!res.payload?.length) {
                this.fbnsDebug(
                    `Received empty connect packet. Reason: ${res.errorName}; Try resetting your fbns state!`,
                );
                this.emit(
                    'error',
                    new EmptyPacketError('Received empty connect packet. Try resetting your fbns state!'),
                );
                await this.client.disconnect();
                return;
            }
            const payload = res.payload.toString('utf8');
            this.fbnsDebug(`Received auth: ${payload}`);
            this._auth.read(payload);
            this.emit('auth', this.auth);
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

        await this.client
            .connect({
                keepAlive: 60,
                protocolLevel: 3,
                clean: true,
                connectDelay: 60 * 1000,
            })
            .catch(e => {
                this.fbnsDebug(`Connection failed: ${e}`);
                throw e;
            });
        await this.client.subscribe({ topic: FbnsTopics.FBNS_MESSAGE.id });

        const msg = await listenOnce<MqttMessage>(this.client, FbnsTopics.FBNS_REG_RESP.id);

        const data = await tryUnzipAsync(msg.payload);
        const payload = data.toString('utf8');
        this.fbnsDebug(`Received register response: ${payload}`);

        const { token, error } = JSON.parse(payload);
        if (error) {
            this.emit('error', error);
            throw error;
        }
        try {
            await this.sendPushRegister(token);
        } catch (e) {
            this.emit('error', e);
            throw e;
        }
    }

    public disconnect(): Promise<void> {
        this.safeDisconnect = true;
        return this.client.disconnect();
    }

    private async handleMessage(msg: MqttMessage) {
        const payload: FbnsMessageData = JSON.parse((await tryUnzipAsync(msg.payload)).toString('utf8'));

        if (notUndefined(payload.fbpushnotif)) {
            const notification = createNotificationFromJson(payload.fbpushnotif);
            this.emit('push', notification);
            if (notification.collapseKey) this.emit(notification.collapseKey, notification);
        } else {
            this.fbnsDebug(`Received a message without 'fbpushnotif': ${JSON.stringify(payload)}`);
            this.emit('message', payload);
        }
    }

    public async sendPushRegister(token: string): Promise<StatusResponse> {
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
}
