import { IgApiClient } from 'instagram-private-api';
import { REALTIME, Topics } from '../constants';
import { EventEmitter } from 'events';
import { ParsedMessage } from './parsers/parser';
import { Commands } from './commands/commands';
import { thriftRead } from '../thrift';
import { compressDeflate, createUserAgent, unzipAsync } from '../shared';
import { Topic } from '../topic';
import { RealtimeSubDirectMessage } from './messages/realtime-sub.direct.message';
import { random } from 'lodash';
import { MQTToTClient } from '../mqttot/mqttot.client';
import { MQTToTConnection } from '../mqttot/mqttot.connection';
// @ts-ignore
import { Int64 } from 'node-cint64';

export declare interface RealtimeClient {
    on(event: 'error', cb: (e: Error) => void);
    on(event: 'receive', cb: (topic: Topic, messages?: ParsedMessage[]) => void);
    on(event: 'close', cb: () => void);

    on(event: 'realtimeSub', cb: (message: ParsedMessage) => void);
    on(event: 'direct', cb: (directMessage: RealtimeSubDirectMessage) => void);
}

export declare type OnReceiveCallback = (messages: ParsedMessage[]) => void;
export class RealtimeClient extends EventEmitter {
    private client: MQTToTClient;
    private connection: MQTToTConnection;
    private readonly ig: IgApiClient;

    private gQlSubs: string[];

    public commands: Commands;

    public constructor(ig: IgApiClient, subs: string[] = []) {
        super();
        this.ig = ig;
        this.gQlSubs = subs;
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

    public async connect() {
        this.client = new MQTToTClient({
            url: REALTIME.HOST_NAME_V6,
            payload: await compressDeflate(this.connection.toThrift()),
        });
        this.commands = new Commands(this.client);
        const topicsArray = Object.values(Topics);
        this.client.on('message', async packet => {
            if (packet.payload === null) {
                this.emit('receive', packet.topic, packet.payload);
                return true;
            }
            const unzipped = await unzipAsync(packet.payload);
            const topic = topicsArray.find(t => t.id === packet.topic);
            if (topic && topic.parser) {
                const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                switch (topic) {
                    case Topics.REALTIME_SUB: {
                        this.handleRealtimeSub(parsedMessages);
                        break;
                    }
                    default: {
                        this.emit('receive', topic, parsedMessages);
                        break;
                    }
                }
            } else {
                try {
                    this.emit('receive', topic, thriftRead(unzipped));
                } catch (e) {
                    this.emitWarning(e);
                    this.emit('receive', topic, unzipped.toString('utf8'));
                }
            }
        });
        this.client.on('error', e => this.emitError(e));
        this.client.on('warning', w => this.emitWarning(w));
        this.client.on('close', () => this.emitError(new Error('MQTToTClient was closed')));
        this.client.on('disconnect', () => this.emitError(new Error('MQTToTClient got disconnected.')));
        this.client.on('mqttotConnect', async () => {
            Object.values(Topics)
                .map(topic => ({ topic: topic.path }))
                .forEach(t => this.client.subscribe(t));
            if (this.gQlSubs.length > 0) {
                await this.commands.updateSubscriptions({
                    topic: Topics.REALTIME_SUB,
                    data: {
                        sub: this.gQlSubs,
                    },
                });
            }
        });

        this.client.connect({
            keepAlive: 0,
            protocolLevel: 3,
            clean: true,
        });
    }

    private emitError = (e: Error) => this.emit('error', e);
    private emitWarning = (e: Error) => this.emit('warning', e);

    public subscribe(subs: string | string[]) {
        return this.commands.updateSubscriptions({
            topic: Topics.REALTIME_SUB,
            data: {
                sub: typeof subs === 'string' ? [subs] : subs,
            },
        });
    }

    private handleRealtimeSub(parsedMessages: ParsedMessage[]) {
        for (const msg of parsedMessages) {
            switch (msg.data.topic) {
                case 'direct': {
                    const parsed: RealtimeSubDirectMessage = JSON.parse(msg.data.payload.value);
                    parsed.data = parsed.data.map(e => {
                        if (typeof e.value === 'string') {
                            e.value = JSON.parse(e.value);
                        }
                        return e;
                    });
                    this.emit('direct', parsed);
                    break;
                }
                default: {
                    this.emit('realtimeSub', msg);
                }
            }
        }
    }

    private createUsername(): string {
        return JSON.stringify({
            dc: 'PRN',
            // userId
            u: this.ig.state.cookieUserId,
            // agent
            a: createUserAgent(this.ig),
            // capabilities
            cp: 439,
            // client sessionId
            mqtt_sid: random(100000000, 999999999),
            // networkType
            nwt: 1,
            // networkSubtype
            nwst: 0,

            chat_on: false,
            no_auto_fg: true,
            d: this.ig.state.phoneId,
            ds: '',
            fg: false,
            ecp: 0,
            pf: 'jz',
            ct: 'cookie_auth',
            aid: this.ig.state.fbAnalyticsApplicationId,
            st: ['/pubsub', '/t_region_hint', '/ig_send_message_response'],
            clientStack: 3,
            app_specific_info: this.createAppSpecificInfo(),
        });
    }

    private createAppSpecificInfo(): object {
        return {
            app_version: this.ig.state.appVersion,
            'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
            everclear_subscriptions:
                '{' +
                '"inapp_notification_subscribe_comment":"17899377895239777",' +
                '"inapp_notification_subscribe_comment_mention_and_reply":"17899377895239777",' +
                '"video_call_participant_state_delivery":"17977239895057311"' +
                //'"presence_subscribe":"17846944882223835"' +
                '}',
            'User-Agent': this.ig.state.appUserAgent,
            'Accept-Language': this.ig.state.language.replace('_', '-'),
            platform: 'android',
            ig_mqtt_route: 'django',
            pubsub_msg_type_blacklist: 'direct, typing_type',
            auth_cache_enabled: '0',
        };
    }
}
