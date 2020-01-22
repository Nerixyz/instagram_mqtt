import { IgApiClient } from 'instagram-private-api';
import { REALTIME, Topics } from '../constants';
import { EventEmitter } from 'events';
import { ParsedMessage, IrisParserData, GraphQlMessage } from './parsers';
import { Commands } from './commands';
import { thriftRead } from '../thrift';
import { compressDeflate, debugChannel, unzipAsync } from '../shared';
import { Topic } from '../topic';
import { RealtimeSubDirectDataWrapper, MessageSyncMessageWrapper, AppPresenceEventWrapper } from './messages';
import { MQTToTClient, MQTToTConnection, MQTToTConnectionClientInfo } from '../mqttot';
import { QueryIDs } from './subscriptions';
import { DirectCommands } from './commands';
import { deprecate } from 'util';
import { defaults } from 'lodash';
import { MqttMessage } from '../mqtt';

export declare interface RealtimeClient {
    on(event: 'error', cb: (e: Error) => void);

    on(event: 'warning', cb: (e: any | Error) => void);

    on(event: 'receive', cb: (topic: Topic, messages?: ParsedMessage<any>[]) => void);

    on(event: 'close', cb: () => void);

    on(event: 'realtimeSub', cb: (message: ParsedMessage<any>) => void);

    on(event: 'direct', cb: (directData: RealtimeSubDirectDataWrapper) => void);

    on(event: 'iris', cb: (irisData: Partial<IrisParserData> & any) => void);

    on(event: 'message', cb: (message: MessageSyncMessageWrapper) => void);

    on(event: 'appPresence', cb: (data: AppPresenceEventWrapper) => void);

    on(
        event: 'clientConfigUpdate',
        cb: (data: {
            client_config_update_event: {
                publish_id: string;
                client_config_name: string;
                backing: 'QE' | string;
                client_subscription_id: '17849856529644700' | string;
            };
        }) => void,
    );

    on(event: string, cb: (...args: any[] | undefined) => void);
}

//export declare type OnReceiveCallback = (messages: ParsedMessage<any>[]) => void;

export interface RealtimeClientInitOptions {
    graphQlSubs?: string[];
    skywalkerSubs?: string[];
    irisData?: { seq_id: number; snapshot_at_ms: number };
    connectOverrides?: MQTToTConnectionClientInfo;
    enableTrace?: boolean;
}

export class RealtimeClient extends EventEmitter {
    private realtimeDebug = debugChannel('realtime');

    private client: MQTToTClient;
    private connection: MQTToTConnection;
    private readonly ig: IgApiClient;

    private initOptions: RealtimeClientInitOptions;
    private safeDisconnect = false;

    public commands: Commands;
    public direct: DirectCommands;

    /**
     *
     * @param {IgApiClient} ig
     * @param {RealtimeClientInitOptions | string[]} initOptions string array is deprecated
     */
    public constructor(ig: IgApiClient, initOptions?: RealtimeClientInitOptions | string[]) {
        super();
        this.ig = ig;
        this.setInitOptions(initOptions);
    }

    private setInitOptions(initOptions?: RealtimeClientInitOptions | string[]) {
        if (Array.isArray(initOptions)) initOptions = { graphQlSubs: initOptions };
        this.initOptions = defaults<RealtimeClientInitOptions, RealtimeClientInitOptions>(initOptions || {}, {
            graphQlSubs: [],
            skywalkerSubs: [],
        });
    }

    private constructConnection() {
        const userAgent = this.ig.state.appUserAgent;
        const deviceId = this.ig.state.phoneId;
        const password = `sessionid=${this.ig.state.extractCookieValue('sessionid')}`;
        this.connection = new MQTToTConnection({
            clientIdentifier: deviceId.substring(0, 20),
            clientInfo: {
                userId: BigInt(Number(this.ig.state.cookieUserId)),
                userAgent,
                clientCapabilities: 183,
                endpointCapabilities: 0,
                publishFormat: 1,
                noAutomaticForeground: false,
                makeUserAvailableInForeground: true,
                deviceId,
                isInitiallyForeground: true,
                networkType: 1,
                networkSubtype: 0,
                clientMqttSessionId: BigInt(Date.now()) & BigInt(0xffffffff),
                subscribeTopics: [88, 135, 149, 150, 133, 146],
                clientType: 'cookie_auth',
                appId: BigInt(567067343352427),
                deviceSecret: '',
                clientStack: 3,
                ...(this.initOptions.connectOverrides || {}),
            },
            password,
            appSpecificInfo: {
                app_version: this.ig.state.appVersion,
                'X-IG-Capabilities': this.ig.state.capabilitiesHeader,
                everclear_subscriptions:
                    '{' +
                    '"inapp_notification_subscribe_comment":"17899377895239777",' +
                    '"inapp_notification_subscribe_comment_mention_and_reply":"17899377895239777",' +
                    '"video_call_participant_state_delivery":"17977239895057311",' +
                    '"presence_subscribe":"17846944882223835"' +
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

    public async connect(initOptions?: RealtimeClientInitOptions | string[]) {
        this.realtimeDebug('Connecting to realtime-broker...');
        this.setInitOptions(initOptions);
        this.realtimeDebug(`Overriding: ${Object.keys(this.initOptions.connectOverrides || {}).join(', ')}`);
        this.constructConnection();
        this.client = new MQTToTClient({
            url: REALTIME.HOST_NAME_V6,
            payload: await compressDeflate(this.connection.toThrift()),
        });
        this.commands = new Commands(this.client);
        this.direct = new DirectCommands(this.client);
        const topicsArray = Object.values(Topics);
        this.client.on('message', async packet => {
            if (packet.payload === null) {
                this.realtimeDebug(`Received empty packet on topic ${packet.topic}`);
                this.emit('receive', packet.topic, packet.payload);
                return true;
            }
            const unzipped = await unzipAsync(packet.payload);
            const topic = topicsArray.find(t => t.id === packet.topic);
            if (topic && topic.parser) {
                const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                switch (topic) {
                    case Topics.REALTIME_SUB: {
                        // @ts-ignore - GraphQl parser returns [{topic, data}] => this is possible
                        this.handleRealtimeSub(parsedMessages);
                        break;
                    }
                    case Topics.MESSAGE_SYNC: {
                        this.handleMessageSync(parsedMessages.map(m => m.data));
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
                    this.realtimeDebug(
                        `Error while reading packet: ${JSON.stringify({
                            topic: packet.topic,
                            unzipped: unzipped.toString('hex'),
                        })}`,
                    );
                    this.realtimeDebug(e);
                    this.emitWarning(e);
                    this.emit('receive', topic, unzipped.toString('utf8'));
                }
            }
        });
        this.client.on('error', e => this.emitError(e));
        this.client.on('warning', w => this.emitWarning(w));
        this.client.on('close', () => this.emitError(new Error('MQTToTClient was closed')));
        this.client.on('disconnect', () =>
            this.safeDisconnect ? this.emit('disconnect') : this.emitError(new Error('MQTToTClient got disconnected.')),
        );
        return new Promise(resolve => {
            this.client.once('mqttotConnect', async () => {
                this.realtimeDebug('Connected. Checking initial subs.');
                const { graphQlSubs, skywalkerSubs, irisData } = this.initOptions;
                await Promise.all([
                    graphQlSubs.length > 0 ? this.graphQlSubscribe(graphQlSubs) : null,
                    skywalkerSubs.length > 0 ? this.skywalkerSubscribe(skywalkerSubs) : null,
                    irisData ? this.irisSubscribe(irisData) : null,
                ]);
                Object.values(Topics).forEach(topic => this.client.subscribe({ topic: topic.id }));
                resolve();
            });
            this.client.connect({
                keepAlive: 0,
                protocolLevel: 3,
                clean: true,
                enableTrace: this.initOptions.enableTrace,
            });
        });
    }

    private emitError = (e: Error) => this.emit('error', e);
    private emitWarning = (e: Error) => this.emit('warning', e);

    public disconnect() {
        this.safeDisconnect = true;
        return this.client.disconnect();
    }

    public subscribe = deprecate(
        (subs: string | string[]) => this.graphQlSubscribe(subs),
        'Use RealtimeClient.graphQlSubscribe instead',
    );

    public graphQlSubscribe(sub: string | string[]): Promise<MqttMessage> {
        sub = typeof sub === 'string' ? [sub] : sub;
        this.realtimeDebug(`Subscribing with GraphQL to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: Topics.REALTIME_SUB,
            data: {
                sub,
            },
        });
    }

    public skywalkerSubscribe(sub: string | string[]): Promise<MqttMessage> {
        sub = typeof sub === 'string' ? [sub] : sub;
        this.realtimeDebug(`Subscribing with Skywalker to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: Topics.PUBSUB,
            data: {
                sub,
            },
        });
    }

    public irisSubscribe({ seq_id, snapshot_at_ms }: { seq_id: number; snapshot_at_ms: number }) {
        this.realtimeDebug(`Iris Sub to: seqId: ${seq_id}, snapshot: ${snapshot_at_ms}`);
        return this.commands.updateSubscriptions({
            topic: Topics.IRIS_SUB,
            data: {
                seq_id,
                snapshot_at_ms,
            },
        });
    }

    private handleRealtimeSub([message]: [{ topic: string; data: GraphQlMessage }]) {
        const { topic, json, payload } = message.data;
        this.emit('realtimeSub', message);
        switch (topic) {
            case 'direct': {
                const parsed = json;
                parsed.data = parsed.data.map(e => {
                    if (typeof e.value === 'string') {
                        e.value = JSON.parse(e.value);
                    }
                    return e;
                });
                parsed.data.forEach(data => this.emit('direct', data));
                break;
            }
            default: {
                const entries = Object.entries(QueryIDs);
                const query = entries.find(e => e[1] === topic);
                if (query) {
                    this.emit(query[0], json || payload);
                }
            }
        }
    }

    private handleMessageSync(syncData: IrisParserData[]) {
        for (const element of syncData) {
            const data = element.data;
            delete element.data;
            data.forEach(e => {
                if (e.path && e.value) {
                    if (e.path.startsWith('/direct_v2/threads/')) {
                        const [, , , thread_id] = e.path.split('/');
                        this.emit('message', {
                            ...element,
                            message: {
                                path: e.path,
                                op: e.op,
                                thread_id,
                                ...JSON.parse(e.value),
                            },
                        });
                    }
                } else {
                    this.emit('iris', { ...element, ...e });
                }
            });
        }
    }
}
