import {IgApiClient} from "instagram-private-api";
import {PossibleTopics, REALTIME, Topics} from "../constants";
import { EventEmitter } from "events";
import {ParsedMessage} from "./parsers/parser";
import {Commands} from "./commands/commands";
import { unzip } from "zlib";
import {thriftRead} from "../thrift";
import {createUserAgent} from "../shared";
import {MqttClient} from "../mqtt/mqtt.client";
import {MqttPacket} from "../mqtt/mqtt.packet";
import {MqttMessage} from "../mqtt/mqtt.message";
import { Topic } from "../topic";
import {RealtimeSubDirectMessage} from "./messages/realtime-sub.direct.message";
const {random} = require('lodash');

export declare interface RealtimeClient {
    on(event: 'error', cb: (e: Error) => void);
    on(event: 'receive', cb: (topic: Topic, messages?: ParsedMessage[]) => void);
    on(event: 'close', cb: () => void);

    on(event: 'realtimeSub', cb: (message: ParsedMessage) => void);
    on(event: 'direct', cb: (directMessage: RealtimeSubDirectMessage) => void);
}

export declare type OnReceiveCallback = (messages: ParsedMessage[]) => void;
export class RealtimeClient extends EventEmitter {
    private readonly client: MqttClient;
    private readonly ig: IgApiClient;

    public commands: Commands;

    constructor(ig: IgApiClient, subs: string[] = []){
        super();
        this.ig = ig;
        this.client = new MqttClient({url: REALTIME.HOST_NAME_V6});
        this.client.connect({
            keepAlive: 900,
            protocolName: 'MQIsdp',
            protocolLevel: 3,
            username: this.createUsername(),
            password: `sessionid=${this.ig.state.extractCookieValue('sessionid')}`,
            clientId: this.ig.state.phoneId.substr(0, 20),
            clean: true
        });
        this.commands = new Commands(this.client);

        this.client.once('connect', async () => {
            Object.values(Topics).map(topic => ({topic: topic.path})).forEach(t => this.client.subscribe(t));
            await this.commands.updateSubscriptions({
                topic: Topics.REALTIME_SUB, data: {
                    sub: subs,
                }
            });
        });

        const topicsArray = Object.values(Topics);

        this.client.on('warning', (err) => this.emit('error', err));
        this.client.on('error', (err) => this.emit('error', err));
        this.client.on('close', () => this.emit('close'));
        this.client.on('message', (packet: MqttMessage) => {
            if (packet.payload === null) {
                this.emit('receive', packet.topic, packet.payload);
                return true;
            }

            unzip(packet.payload, (err, result) => {
                if (!err) {
                    const topic = topicsArray.find(t => t.id === packet.topic);
                    if (topic && topic.parser) {
                        const parsedMessage = topic.parser.parseMessage(topic, result);
                        switch (topic) {
                            case Topics.REALTIME_SUB: {
                                for(const msg of parsedMessage) {
                                    switch (msg.data.topic) {
                                        case 'direct': {
                                            const parsed: RealtimeSubDirectMessage = JSON.parse(msg.data.payload.value);
                                            parsed.data = parsed.data.map(e => {
                                                if(typeof e.value === 'string'){
                                                    e.value = JSON.parse(e.value);
                                                }
                                                return e;
                                            });
                                            this.emit('direct', parsed);
                                            break;
                                        } default: {
                                            this.emit('realtimeSub', msg);
                                        }
                                    }
                                }
                                break;
                            } default: {
                                this.emit('receive', topic, parsedMessage);
                                break;
                            }
                        }
                    } else {
                        this.emit('receive', topic,thriftRead(result));
                    }
                } else {
                    console.log(err);
                }
            });
        });
    }

    public subscribe(subs: string | string[]) {
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
            'a': createUserAgent(this.ig),
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
