import { hook, Mixin } from './mixin';
import { RealtimeClient } from '../realtime.client';
import { Topics } from '../../constants';
import { tryUnzipAsync } from '../../shared';
import { IrisParserData } from '../parsers';

export class MessageSyncMixin extends Mixin {
    apply(client: RealtimeClient): void {
        hook(client, 'connect', {
            post: () => {
                client.mqtt.listen(
                    {
                        topic: Topics.MESSAGE_SYNC.id,
                        transformer: async ({ payload }) =>
                            Topics.MESSAGE_SYNC.parser
                                .parseMessage(Topics.MESSAGE_SYNC, await tryUnzipAsync(payload))
                                .map(msg => msg.data),
                    },
                    data => this.handleMessageSync(client, data),
                );
            },
        });
    }

    private handleMessageSync(client: RealtimeClient, syncData: IrisParserData[]) {
        for (const element of syncData) {
            const data = element.data;
            if (!data) {
                client.emit('iris', element);
                continue;
            }
            delete element.data;
            data.forEach(e => {
                if (!e.path) {
                    client.emit('iris', { ...element, ...e });
                }
                if (e.path.startsWith('/direct_v2/threads') && e.value) {
                    client.emit('message', {
                        ...element,
                        message: {
                            path: e.path,
                            op: e.op,
                            thread_id: MessageSyncMixin.getThreadIdFromPath(e.path),
                            ...JSON.parse(e.value),
                        },
                    });
                } else {
                    client.emit('threadUpdate', {
                        ...element,
                        meta: {
                            path: e.path,
                            op: e.op,
                            thread_id: MessageSyncMixin.getThreadIdFromPath(e.path),
                        },
                        update: {
                            ...JSON.parse(e.value),
                        },
                    });
                }
            });
        }
    }

    private static getThreadIdFromPath(path: string): string | undefined {
        const itemMatch = path.match(/^\/direct_v2\/threads\/(\d+)/);
        if (itemMatch) return itemMatch[1];
        const inboxMatch = path.match(/^\/direct_v2\/inbox\/threads\/(\d+)/);
        if (inboxMatch) return inboxMatch[1];

        return undefined;
    }

    get name(): string {
        return 'Message Sync';
    }
}
