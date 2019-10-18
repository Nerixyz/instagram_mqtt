import {IgApiClient} from "instagram-private-api";
import {FBNS, FbnsTopics, INSTAGRAM_PACKAGE_NAME, REALTIME} from "../constants";
import {FbnsDeviceAuth} from "./fbns.device-auth";
import {compressDeflate, createUserAgent, unzipAsync} from "../shared";
import {EventEmitter} from "events";
import {MQTToTConnection} from "../mqttot/mqttot.connection";
import {MQTToTClient, MQTToTConnectFlow} from "../mqttot/mqttot.client";
import {ConnectResponsePacket} from "../mqtt/packets/connect.response.packet";
import {PublishRequestPacket} from "../mqtt/packets/publish.request.packet";
import {IdentifierPacket} from "../mqtt/packets/identifiable.packet";
const Chance = require('chance').Chance;

const Int64 = require('node-cint64').Int64;

export class FbnsClient extends EventEmitter {
    get auth(): FbnsDeviceAuth {
        return this._auth;
    }

    set auth(value: FbnsDeviceAuth) {
        this._auth = value;
    }
    private client: MQTToTClient;
    private ig: IgApiClient;
    private conn: MQTToTConnection;
    private _auth: FbnsDeviceAuth;

    constructor(ig: IgApiClient) {
        super();
        this.ig = ig;
        this._auth = new FbnsDeviceAuth(this.ig);
        this.buildConnection();
    }

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
                subscribeTopics: [
                    76, 80, 231,
                ],
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
        this.client.on('message', async (msg: PublishRequestPacket) => {
            switch (msg.topic) {
                case FbnsTopics.FBNS_REG_RESP.id: {
                    const data = await unzipAsync(msg.payload);

                    const {token, error} = JSON.parse(data.toString('utf8'));
                    if(error) {
                        this.emit('error', error);
                        return;
                    }
                    await this.sendPushRegister(token);
                    break;
                }
                case FbnsTopics.FBNS_MESSAGE.id: {
                    this.emit('push', JSON.parse((await unzipAsync(msg.payload)).toString('utf8')));
                    break;
                }
                default: {
                    this.emit('warning', new Error(`Received unknown packet on ${msg.topic}.`))
                }
            }
        });
        this.client.on('warning', console.error);
        this.client.on('error', console.error);
        this.client.on('open', () => console.log('open'));
        this.client.on('close', () => console.log('close'));
        this.client.on('disconnect', () => console.log('disconnect'));

        this.client.on('mqttotConnect', async (res: ConnectResponsePacket) => {
            this._auth.read(res.payload.toString('utf8'));
            this.emit('auth', this.auth);
            IdentifierPacket.generateIdentifier();
            await this.client.mqttotPublish({
                topic: FbnsTopics.FBNS_REG_REQ.id,
                payload: Buffer.from(JSON.stringify({
                    pkg_name: INSTAGRAM_PACKAGE_NAME,
                    appid: this.ig.state.fbAnalyticsApplicationId,
                }), 'utf8'),
                qosLevel: 1,
            });
            this.buildConnection();
        });

        this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true
        });
    }

    public async sendPushRegister(token: string) {
        const {body} = await this.ig.request.send({
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
                family_device_id: new Chance().guid({version: 4}),
            }
        });
        return body;
    }
}
