import { IgApiClient } from 'instagram-private-api';
import { FbnsClient } from './fbns/fbns.client';
import { RealtimeClient, RealtimeClientInitOptions } from './realtime/realtime.client';
import { omit } from 'lodash';
import { InvalidStateError } from './errors';

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
            name: 'client',
            onExport: async client => omit(await client.state.serialize(), ['constants']),
            onImport: (data, client) => client.state.deserialize(data),
        });
    }

    public addStateHook(hook: StateHook<any>) {
        if (this.sateHooks.some(x => x.name === hook.name)) throw new InvalidStateError('Hook already registered');
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
            // @ts-ignore
            onExport: (client: IgApiClientFbns) => client.fbns.auth.toString(),
            // @ts-ignore
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

export function withFbnsAndRealtime(
    client: IgApiClient | IgApiClientExt,
    initOptions?: RealtimeClientInitOptions,
): IgApiClientMQTT {
    client = assertClient(client);
    Object.defineProperty(client, 'fbns', { value: new FbnsClient(client), enumerable: false });
    Object.defineProperty(client, 'realtime', { value: new RealtimeClient(client, initOptions), enumerable: false });
    if (client instanceof IgApiClientExt) {
        client.addStateHook({
            name: 'fbns',
            // @ts-ignore
            onExport: (client: IgApiClientMQTT) => client.fbns.auth.toString(),
            // @ts-ignore
            onImport: (data: string, client: IgApiClientMQTT) => client.fbns.auth.read(data),
        });
    }
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
