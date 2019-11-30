import { IgApiClient } from 'instagram-private-api';
import { FbnsClient } from './fbns/fbns.client';
import { RealtimeClient, RealtimeClientInitOptions } from './realtime/realtime.client';

export interface StateHook<T> {
    name: string;
    onExport: (client: IgApiClientExt) => PromiseLike<T> | T;
    onImport: (data: T, client: IgApiClientExt) => PromiseLike<void> | void;
}

export class IgApiClientExt extends IgApiClient {
    protected sateHooks: StateHook<any>[] = [];

    public async exportState(): Promise<string> {
        const data = {};
        for (const hook of this.sateHooks) {
            Object.defineProperty(data, hook.name, { value: await hook.onExport(this), enumerable: true });
        }
        return JSON.stringify(data);
    }

    public async importState(state: string | object): Promise<void> {
        if (typeof state === 'string') state = JSON.parse(state);

        for (const [key, value] of Object.entries(state)) {
            const hook = this.sateHooks.find(x => x.name === key);
            if (hook) {
                await hook.onImport(value, this);
            }
        }
    }

    public constructor() {
        super();
        this.addStateHook({
            name: 'cookies',
            onExport: async client => JSON.stringify(await client.state.serializeCookieJar()),
            onImport: (data, client) => client.state.deserializeCookieJar(data),
        });
        this.addStateHook({
            name: 'device',
            onExport: client => ({
                deviceString: client.state.deviceString,
                deviceId: client.state.deviceId,
                uuid: client.state.uuid,
                phoneId: client.state.phoneId,
                adid: client.state.adid,
                build: client.state.build,
            }),
            onImport: (data, client) => {
                client.state.deviceString = data.deviceString;
                client.state.deviceId = data.deviceId;
                client.state.uuid = data.uuid;
                client.state.phoneId = data.phoneId;
                client.state.adid = data.adid;
                client.state.build = data.build;
            },
        });
    }

    public addStateHook(hook: StateHook<any>) {
        if (this.sateHooks.some(x => x.name === hook.name)) throw new Error('Hook already registered');
        this.sateHooks.push(hook);
    }
}

export type IgApiClientFbns = IgApiClientExt & { fbns: FbnsClient };
export type IgApiClientRealtime = IgApiClientExt & { realtime: RealtimeClient };
export type IgApiClientMQTT = IgApiClientFbns & IgApiClientRealtime;

export function withFbns(client: IgApiClient | IgApiClientExt): IgApiClientFbns {
    client = assertClient(client);
    Object.defineProperty(client, 'fbns', { value: new FbnsClient(client), enumerable: false });
    if (client instanceof IgApiClientExt) {
        client.addStateHook({
            name: 'fbns',
            onExport: (client: IgApiClientFbns) => client.fbns.auth.toString(),
            onImport: (data: string, client: IgApiClientFbns) => client.fbns.auth.read(data),
        });
    }
    // @ts-ignore
    return client;
}

export function withRealtime(
    client: IgApiClient | IgApiClientExt,
    initOptions?: RealtimeClientInitOptions,
): IgApiClientRealtime {
    client = assertClient(client);
    Object.defineProperty(client, 'realtime', { value: new RealtimeClient(client, initOptions), enumerable: false });
    // @ts-ignore
    return client;
}

function assertClient(client: IgApiClient | IgApiClientExt): IgApiClientExt {
    if (!(client instanceof IgApiClientExt)) {
        return new IgApiClientExt();
    }
    // @ts-ignore
    return client;
}
