import { EventEmitter } from 'events';
import { IgApiClient } from 'instagram-private-api';
import { MQTToTClient } from './mqttot.client';
import { MQTToTConnection } from './mqttot.connection';
import { REALTIME } from '../constants';
import { compressDeflate } from '../shared';

const Int64 = require('node-cint64').Int64;

export declare interface MQTToTRealtimeClient {
    on(event, cb);
}

export class MQTToTRealtimeClient extends EventEmitter {
    private client: MQTToTClient;
    private ig: IgApiClient;
    private connection: MQTToTConnection;

    public constructor(instagram: IgApiClient) {
        super();
        this.ig = instagram;

        const userAgent = this.ig.state.appUserAgent;
        const deviceId = this.ig.state.phoneId;
        const password = `sessionid=${this.ig.state.extractCookieValue('sessionid')}`;

        this.connection = new MQTToTConnection({
            clientIdentifier: deviceId.substring(0, 20),
            clientInfo: {
                userId: new Int64(Number(this.ig.state.cookieUserId)),
                userAgent,
                clientCapabilities: 183,
                endpointCapabilities: 0,
                publishFormat: 1,
                noAutomaticForeground: true,
                makeUserAvailableInForeground: false,
                deviceId,
                isInitiallyForeground: true,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: new Int64(Date.now() & 0xffffffff),
                subscribeTopics: [88, 135, 149, 150, 133, 146],
                clientType: 'cookie_auth',
                appId: new Int64(567067343352427),
                deviceSecret: '',
                clientStack: 3,
            },
            password,
            appSpecificInfo: {
                app_version: this.ig.state.appVersion,
                'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
                everclear_subscriptions:
                    '{' +
                    '"inapp_notification_subscribe_comment":"17899377895239777",' +
                    '"inapp_notification_subscribe_comment_mention_and_reply":"17899377895239777",' +
                    '"video_call_participant_state_delivery":"17977239895057311"' +
                    '}',
                'User-Agent': userAgent,
                'Accept-Language': this.ig.state.language.replace('_', '-'),
                platform: 'android',
                ig_mqtt_route: 'django',
                pubsub_msg_type_blacklist: 'direct, typing_type',
                auth_cache_enabled: '0',
            },
        });
    }

    private emitError = (e: Error) => this.emit('error', e);
    private emitWarning = (e: Error) => this.emit('warning', e);

    public async connect() {
        this.client = new MQTToTClient({
            url: REALTIME.HOST_NAME_V6,
            payload: await compressDeflate(this.connection.toThrift()),
        });
        this.client.on('message', msg => {
            this.emit('message', msg);
        });
        this.client.on('error', e => this.emitError(e));
        this.client.on('warning', w => this.emitWarning(w));
        this.client.on('close', () => this.emitError(new Error('MQTToTClient was closed')));
        this.client.on('disconnect', () => this.emitError(new Error('MQTToTClient got disconnected.')));
        this.client.on('mqttotConnect', x => this.emit('message', x));

        this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true,
        });
    }
}
