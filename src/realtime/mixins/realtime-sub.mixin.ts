import { hook, Mixin } from './mixin';
import { RealtimeClient } from '../realtime.client';
import { Topics } from '../../constants';
import { tryUnzipAsync } from '../../shared';
import { GraphQlMessage, ParsedMessage } from '../parsers';
import { QueryIDs } from '../subscriptions';
import { RealtimeSubDirectDataWrapper } from '../messages';

export class RealtimeSubMixin extends Mixin {
    apply(client: RealtimeClient): void {
        hook(client, 'connect', {
            post: () => {
                client.mqtt.listen(
                    {
                        topic: Topics.REALTIME_SUB.id,
                        transformer: async ({ payload }) =>
                            Topics.REALTIME_SUB.parser.parseMessage(Topics.REALTIME_SUB, await tryUnzipAsync(payload)),
                    },
                    data => this.handleRealtimeSub(client, data),
                );
            },
        });
    }

    private handleRealtimeSub(client: RealtimeClient, { data, topic: messageTopic }: ParsedMessage<GraphQlMessage>) {
        const { message } = data;
        client.emit('realtimeSub', { data, topic: messageTopic });
        if (typeof message === 'string') {
            this.emitDirectEvent(client, JSON.parse(message));
        } else {
            const { topic, payload, json } = message;
            switch (topic) {
                case 'direct': {
                    this.emitDirectEvent(client, json);
                    break;
                }
                default: {
                    const entries = Object.entries(QueryIDs);
                    const query = entries.find(e => e[1] === topic);
                    if (query) {
                        client.emit(query[0] as keyof typeof QueryIDs, json || payload);
                    }
                }
            }
        }
    }

    private emitDirectEvent(client: RealtimeClient, parsed: any): void {
        parsed.data = parsed.data.map((e: any) => {
            if (typeof e.value === 'string') {
                e.value = JSON.parse(e.value);
            }
            return e;
        });
        parsed.data.forEach((data: RealtimeSubDirectDataWrapper) => client.emit('direct', data));
    }

    get name(): string {
        return 'Realtime Sub';
    }

}
