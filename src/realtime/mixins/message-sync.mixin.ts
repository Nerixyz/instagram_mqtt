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
                if (e.path && e.value) {
                    if (e.path.startsWith('/direct_v2/threads/')) {
                        const [, , , thread_id] = e.path.split('/');
                        client.emit('message', {
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
                    client.emit('iris', { ...element, ...e });
                }
            });
        }
    }

    get name(): string {
        return 'Message Sync';
    }
}
