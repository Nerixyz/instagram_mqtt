import { IgApiClient } from 'instagram-private-api';
import { REALTIME, RealtimeTopicsArray, Topics } from '../constants';
import { Commands, DirectCommands } from './commands';
import { compressDeflate, debugChannel, prepareLogString, ToEventFn, tryUnzipAsync } from '../shared';
import { MQTToTClient, MQTToTConnection, MQTToTConnectionClientInfo } from '../mqttot';
import { MqttMessageOutgoing } from 'mqtts';
import { ClientDisconnectedError } from '../errors';
import EventEmitter = require('eventemitter3');
import { RealtimeClientEvents } from './realtime.client.events';
import { applyMixins, Mixin, MessageSyncMixin, RealtimeSubMixin } from './mixins';
import { SocksProxy } from 'socks';

export interface RealtimeClientInitOptions {
    graphQlSubs?: string[];
    skywalkerSubs?: string[];
    irisData?: { seq_id: number; snapshot_at_ms: number };
    connectOverrides?: MQTToTConnectionClientInfo;
    enableTrace?: boolean;
    autoReconnect?: boolean;
    mixins?: Mixin[];
    socksOptions?: SocksProxy
}

export class RealtimeClient extends EventEmitter<ToEventFn<RealtimeClientEvents>> {
    get mqtt(): MQTToTClient {
        return this._mqtt;
    }

    private realtimeDebug = debugChannel('realtime');
    private messageDebug = this.realtimeDebug.extend('message');

    private _mqtt: MQTToTClient;
    private connection: MQTToTConnection;
    private readonly ig: IgApiClient;

    private initOptions: RealtimeClientInitOptions;
    private safeDisconnect = false;

    public commands: Commands;
    public direct: DirectCommands;

    /**
     *
     * @param {IgApiClient} ig
     * @param mixins - by default MessageSync and Realtime mixins are used
     */
    public constructor(ig: IgApiClient, mixins: Mixin[] = [new MessageSyncMixin(), new RealtimeSubMixin()]) {
        super();
        this.ig = ig;
        this.realtimeDebug(`Applying mixins: ${mixins.map(m => m.name).join(', ')}`);
        applyMixins(mixins, this, this.ig);
    }

    private setInitOptions(initOptions?: RealtimeClientInitOptions | string[]) {
        if (Array.isArray(initOptions)) initOptions = { graphQlSubs: initOptions };
        this.initOptions = {
            graphQlSubs: [],
            skywalkerSubs: [],
            ...(initOptions || {}),
            socksOptions: typeof initOptions === 'object' && !Array.isArray(initOptions) ? initOptions.socksOptions : undefined,
        };
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
                everclear_subscriptions: JSON.stringify({
                    inapp_notification_subscribe_comment: '17899377895239777',
                    inapp_notification_subscribe_comment_mention_and_reply: '17899377895239777',
                    video_call_participant_state_delivery: '17977239895057311',
                    presence_subscribe: '17846944882223835',
                }),
                'User-Agent': userAgent,
                'Accept-Language': this.ig.state.language.replace('_', '-'),
                platform: 'android',
                ig_mqtt_route: 'django',
                pubsub_msg_type_blacklist: 'direct, typing_type',
                auth_cache_enabled: '0',
            },
        });
    }

    public async connect(initOptions?: RealtimeClientInitOptions | string[]): Promise<any> {
        this.realtimeDebug('Connecting to realtime-broker...');
        this.setInitOptions(initOptions);
        this.realtimeDebug(`Overriding: ${Object.keys(this.initOptions.connectOverrides || {}).join(', ')}`);
        this._mqtt = new MQTToTClient({
            url: REALTIME.HOST_NAME_V6,
            payloadProvider: () => {
                this.constructConnection();
                return compressDeflate(this.connection.toThrift());
            },
            enableTrace: this.initOptions.enableTrace,
            autoReconnect: this.initOptions.autoReconnect ?? true,
            requirePayload: false,
            socksOptions: this.initOptions.socksOptions
        });
        this.commands = new Commands(this.mqtt);
        this.direct = new DirectCommands(this.mqtt);
        this.mqtt.on('message', async msg => {
            const unzipped = await tryUnzipAsync(msg.payload);
            const topic = RealtimeTopicsArray.find(t => t.id === msg.topic);
            if (topic && topic.parser && !topic.noParse) {
                const parsedMessages = topic.parser.parseMessage(topic, unzipped);
                this.messageDebug(
                    `Received on ${topic.path}: ${JSON.stringify(
                        Array.isArray(parsedMessages)
                            ? parsedMessages.map((x: any) => x.data)
                            : (parsedMessages as any).data,
                    )}`,
                );
                this.emit('receive', topic, Array.isArray(parsedMessages) ? parsedMessages : [parsedMessages]);
            } else {
                this.messageDebug(
                    `Received raw on ${topic?.path ?? msg.topic}: (${unzipped.byteLength} bytes) ${prepareLogString(
                        unzipped.toString(),
                    )}`,
                );
                this.emit('receiveRaw', msg);
            }
        });
        this.mqtt.on('error', e => this.emitError(e));
        this.mqtt.on('warning', w => this.emitWarning(w));
        this.mqtt.on('disconnect', () =>
            this.safeDisconnect
                ? this.emit('disconnect')
                : this.emitError(new ClientDisconnectedError('MQTToTClient got disconnected.')),
        );

        return new Promise((resolve, reject) => {
            this.mqtt.on('connect', async () => {
                this.realtimeDebug('Connected. Checking initial subs.');
                const { graphQlSubs, skywalkerSubs, irisData } = this.initOptions;
                await Promise.all([
                    graphQlSubs && graphQlSubs.length > 0 ? this.graphQlSubscribe(graphQlSubs) : null,
                    skywalkerSubs && skywalkerSubs.length > 0 ? this.skywalkerSubscribe(skywalkerSubs) : null,
                    irisData ? this.irisSubscribe(irisData) : null,
                ]).then(resolve);
            });
            this.mqtt
                .connect({
                    keepAlive: 20,
                    protocolLevel: 3,
                    clean: true,
                    connectDelay: 60 * 1000,
                })
                .catch(e => {
                    this.emitError(e);
                    reject(e);
                });
        });
    }

    private emitError = (e: Error) => this.emit('error', e);
    private emitWarning = (e: Error) => this.emit('warning', e);

    public disconnect(): Promise<void> {
        this.safeDisconnect = true;
        return this.mqtt.disconnect();
    }

    public graphQlSubscribe(sub: string | string[]): Promise<MqttMessageOutgoing> {
        sub = typeof sub === 'string' ? [sub] : sub;
        this.realtimeDebug(`Subscribing with GraphQL to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: Topics.REALTIME_SUB,
            data: {
                sub,
            },
        });
    }

    public skywalkerSubscribe(sub: string | string[]): Promise<MqttMessageOutgoing> {
        sub = typeof sub === 'string' ? [sub] : sub;
        this.realtimeDebug(`Subscribing with Skywalker to ${sub.join(', ')}`);
        return this.commands.updateSubscriptions({
            topic: Topics.PUBSUB,
            data: {
                sub,
            },
        });
    }

    public irisSubscribe({
                             seq_id,
                             snapshot_at_ms,
                         }: {
        seq_id: number;
        snapshot_at_ms: number;
    }): Promise<MqttMessageOutgoing> {
        this.realtimeDebug(`Iris Sub to: seqId: ${seq_id}, snapshot: ${snapshot_at_ms}`);
        return this.commands.updateSubscriptions({
            topic: Topics.IRIS_SUB,
            data: {
                seq_id,
                snapshot_at_ms,
            },
        });
    }
}
