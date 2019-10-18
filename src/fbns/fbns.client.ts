import {IgApiClient} from "instagram-private-api";
import {FBNS, REALTIME} from "../constants";
import {FbnsDeviceAuth} from "./fbns.device-auth";
import {compressDeflate, createUserAgent} from "../shared";
import {EventEmitter} from "events";
import {MQTToTConnection} from "../mqttot/mqttot.connection";
import {MQTToTClient} from "../mqttot/mqttot.client";

const Int64 = require('node-cint64').Int64;

export class FbnsClient extends EventEmitter {
    private client: MQTToTClient;
    private ig: IgApiClient;
    private conn: MQTToTConnection;

    constructor(ig: IgApiClient) {
        super();
        this.ig = ig;
        const deviceAuth = new FbnsDeviceAuth(this.ig);
        this.conn = new MQTToTConnection({
            clientIdentifier: deviceAuth.clientId,
            clientInfo: {
                userId: new Int64(deviceAuth.userId),
                userAgent: createUserAgent(this.ig),
                clientCapabilities: 183,
                endpointCapabilities: 128,
                publishFormat: 1,
                noAutomaticForeground: true,
                makeUserAvailableInForeground: false,
                deviceId: deviceAuth.deviceId,
                isInitiallyForeground: false,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: Date.now() & 0xffffff,
                subscribeTopics: [
                    76, 80, 231,
                ],
                clientType: 'device_auth',
                appId: new Int64(567310203415052),
                deviceSecret: '',
                anotherUnknown: new Int64(-1),
                clientStack: 3,
            },
            password: /*`sessionid=${this.ig.state.clientSessionId}`*/ '',
            // appSpecificInfo: {
            //     app_version: this.ig.state.appVersion,
            //     'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
            //     everclear_subscriptions: '{"inapp_notification_subscribe_comment":"17899377895239777","inapp_notification_subscribe_comment_mention_and_reply":"17899377895239777","video_call_participant_state_delivery":"17977239895057311"}',
            //     'User-Agent': userAgent,
            //     'Accept-Language': this.ig.state.language.replace('_', '-'),
            //     platform: 'android',
            //     ig_mqtt_route: 'django',
            //     pubsub_msg_type_blacklist: 'direct, typing_type',
            //     auth_cache_enabled: '0',
            // }
        });
    }

    public async connect() {
        this.client = new MQTToTClient({
            url: FBNS.HOST_NAME_V6,
            payload: await compressDeflate(this.conn.toThrift()),
        });
        this.client.on('message', (msg) => {
            console.log(msg);
            this.emit('message');
        });
        this.client.on('warning', console.error);
        this.client.on('error', console.error);
        this.client.on('open', () => console.log('open'));
        this.client.on('fbnsConnect', (x) => this.emit('message', x));
        this.client.on('close', () => console.log('close'));
        this.client.on('disconnect', () => console.log('disconnect'));

        this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true
        });
    }
}
