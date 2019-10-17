import {IgApiClient} from "instagram-private-api";
import {FBNS, REALTIME} from "../constants";
import {FbnsDeviceAuth} from "./fbns.device-auth";
import {compressDeflate, createUserAgent} from "../shared";
import {FbnsConnection} from "./fbns.connection";
import {createConnection, Socket} from "net";
import {numbers} from "./numbers";
import {MqttClient} from "../mqtt/mqtt.client";
import {ConnectRequestOptions} from "../mqtt/packets/connect.request.packet";
import {PacketFlow} from "../mqtt/flow/packet-flow";
import {MqttPacket} from "../mqtt/mqtt.packet";
import {PacketTypes} from "../mqtt/mqtt.constants";
import {FbnsConnectRequestPacket} from "./fbns.connect-request.packet";
import {deflateSync} from "zlib";
import {EventEmitter} from "events";
import {OutgoingConnectFlow} from "../mqtt/flow/outgoing.connect.flow";

const Int64 = require('node-cint64').Int64;

export class FbnsClient extends EventEmitter {
    private client: CustomMqttClient;
    private ig: IgApiClient;
    private conn: FbnsConnection;

    constructor(ig: IgApiClient) {
        super();
        this.ig = ig;
        const deviceAuth = new FbnsDeviceAuth(this.ig);
        const deviceId = this.ig.state.deviceId;
        const userAgent = this.ig.state.appUserAgent;
        this.conn = new FbnsConnection({
            clientIdentifier: deviceId.substring(0, 20),
            clientInfo: {
                userId: new Int64(Number(this.ig.state.cookieUserId)),
                userAgent: userAgent,
                clientCapabilities: 183,
                endpointCapabilities: 0,
                publishFormat: 1,
                noAutomaticForeground: true,
                makeUserAvailableInForeground: false,
                deviceId: deviceId,
                isInitiallyForeground: true,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: Date.now() & 0xffffff,
                subscribeTopics: [
                    76, 80, 231, 88,
                    135,
                    149,
                    150,
                    133,
                    146
                ],
                clientType: 'cookie_auth',
                appId: new Int64(567067343352427),
                regionPreference: 'LLA',
                deviceSecret: '',
                clientStack: 3,
            },
            password: `sessionid=${this.ig.state.clientSessionId}`,
            appSpecificInfo: {
                app_version: this.ig.state.appVersion,
                'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
                everclear_subscriptions: '{"inapp_notification_subscribe_comment":"17899377895239777","inapp_notification_subscribe_comment_mention_and_reply":"17899377895239777","video_call_participant_state_delivery":"17977239895057311"}',
                'User-Agent': userAgent,
                'Accept-Language': this.ig.state.language.replace('_', '-'),
                platform: 'android',
                ig_mqtt_route: 'django',
                pubsub_msg_type_blacklist: 'direct, typing_type',
                auth_cache_enabled: '0',
            }
        });
    }

    public async connect() {
        this.client = new CustomMqttClient({
            url: REALTIME.HOST_NAME_V6,
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

class CustomMqttClient extends MqttClient {

    protected fbnsPayload: Buffer;

    constructor(options: { url: string, payload: Buffer }) {
        super({url: options.url});
        this.fbnsPayload = options.payload;
    }

    protected registerClient(options: ConnectRequestOptions) {
        this.startFlow(new FbnsConnectFlow(this.fbnsPayload));
        this.connectTimer = this.executeDelayed(2000, () => {
            this.registerClient(options);
        });
    }
}

class FbnsConnectFlow extends PacketFlow<any> {

    private payload: Buffer;

    constructor(payload: Buffer) {
        super();
        this.payload = payload;
    }

    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    get name(): string {
        return "fbnsConnect";
    }

    next(packet: MqttPacket): MqttPacket {
        console.log('next');
        this.succeeded(undefined);
        return undefined;
    }

    start(): MqttPacket {
        console.log('start');
        return new FbnsConnectRequestPacket(this.payload);
    }

}


