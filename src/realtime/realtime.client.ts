import {connect, MqttClient, Packet} from "mqtt";
import {IgApiClient} from "instagram-private-api";
import {PossibleTopics, REALTIME, Topics} from "../constants";
import { EventEmitter } from "events";
import {ParsedMessage} from "../parsers/parser";
import {Commands} from "../commands/commands";
import {fbnsRead} from "../fbns-reader";
import { unzip } from "zlib";
const {random} = require('lodash');

export declare type OnReceiveCallback = (messages: ParsedMessage[]) => void;
export class RealtimeClient extends EventEmitter {
    private readonly client: MqttClient;
    private ig: IgApiClient;

    public commands: Commands;

    constructor(ig: IgApiClient, subs: string[] = []){
        super();
        this.ig = ig;
        this.client = connect(REALTIME.HOST_NAME_V6, {
            keepalive: 900,
            protocolId: 'MQIsdp',
            protocolVersion: 3,
            resubscribe: false,
            clean: true,
            rejectUnauthorized: false,
            username: this.createUsername(),
            password: `sessionid=${this.ig.state.extractCookieValue('sessionid')}`,
            clientId: this.ig.state.phoneId.substr(0, 20)
        });
        this.commands = new Commands(this.client);

        this.client.once('connect', () => {
            this.client.subscribe(Object.values(PossibleTopics).map(topic => topic.path), async (err) => {
                if (!err) {
                    await this.commands.updateSubscriptions({
                        topic: Topics.REALTIME_SUB, data: {
                            sub: subs,
                        }
                    });
                } else {
                    this.emit('error', err);
                }
            });
        });

        const topicsArray = Object.values(Topics);

        this.client.on('error', (err) => this.emit('error', err));
        this.client.on('close', () => this.emit('close'));
        this.client.on('packetreceive', (packet: any) => {
            if (packet.cmd === 'suback' || packet.cmd === 'puback' || packet.cmd === 'connack') {
                return true;
            }
            if (packet.payload === null) {
                this.emit('receive', packet.topic, packet.payload);
                return true;
            }

            unzip(packet.payload, (err, result) => {
                if (!err) {
                    const topic = topicsArray.find(t => t.id === packet.topic);
                    if (topic && topic.parser) {
                        this.emit('receive', topic, topic.parser.parseMessage(topic, result));
                    } else {
                        this.emit('receive', topic ,fbnsRead(result));
                    }
                } else {
                    console.log(err);
                }
            });
        })
    }

    public subscribe(subs: string | string[]): Promise<Packet> {
        return this.commands.updateSubscriptions({
            topic: Topics.REALTIME_SUB, data: {
                sub: typeof subs === 'string' ? [subs] : subs,
            }
        });
    }

    private createUsername(): string {
        return JSON.stringify({
            'dc': 'PRN',
            // userId
            'u': this.ig.state.cookieUserId,
            // agent
            'a': this.createUserAgent(),
            // capabilities
            'cp': 439,
            // client sessionId
            'mqtt_sid': random(100000000, 999999999),
            // networkType
            'nwt': 1,
            // networkSubtype
            'nwst': 0,

            'chat_on': false,
            'no_auto_fg': true,
            'd': this.ig.state.phoneId,
            'ds': '',
            'fg': false,
            'ecp': 0,
            'pf': 'jz',
            'ct': 'cookie_auth',
            'aid': this.ig.state.fbAnalyticsApplicationId,
            'st': ['/pubsub', '/t_region_hint', '/ig_send_message_response'],
            'clientStack': 3,
            'app_specific_info': this.createAppSpecificInfo(),
        });
    }

    private createUserAgent(): string {
        const deviceParams = this.ig.state.deviceString.split('; ');
        return  `[FBAN/InstagramForAndroid;`
            + `FBAV/${this.ig.state.appVersion};`
            + `FBBV/84433655;`
            + `FBDM/{density=4.0,width=${deviceParams[2].split('x')[0]},height=${deviceParams[2].split('x')[1]};`
            + `FBLC/${this.ig.state.language};`
            + `FBCR/;`
            + `FBMF/${deviceParams[3].toUpperCase()};`
            + `FBBD/${deviceParams[3].toUpperCase()};`
            + `FBPN/com.instagram.android;`
            + `FBDV/${deviceParams[4].toUpperCase()};`
            + `FBSV/7.0;`
            + `FBBK/1;`
            + `FBCA/armeabi-v7a:armeabi;]`;
    }

    private createAppSpecificInfo(): any {
        return {
            'platform': 'android',
            'app_version': this.ig.state.appVersion,
            'capabilities': JSON.stringify(this.ig.state.supportedCapabilities),
            'everclear_subscriptions': '{\'presence_subscribe\':\'17846944882223835\'}',
            'User-Agent': this.ig.state.appUserAgent,
            'ig_mqtt_route': 'django',
            'Accept-Language': 'en-US',
            'pubsub_msg_type_blacklist': 'typing_type',
        };
    }
}
