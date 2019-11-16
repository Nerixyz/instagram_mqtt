import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftTypes, thriftRead } from '../../thrift';

export class SkywalkerParser implements Parser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<any>[] {
        const msg = thriftRead(payload);
        return [
            {
                topic,
                data: {
                    topic: msg.find(x => x.type === ThriftTypes.INT_32 && x.field === 1).value,
                    payload: JSON.parse(msg.find(x => x.type === ThriftTypes.BINARY && x.field === 2).value),
                },
            },
        ];
    }
}
