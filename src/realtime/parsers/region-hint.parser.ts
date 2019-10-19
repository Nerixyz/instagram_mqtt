import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftTypes, thriftRead } from '../../thrift';

export class RegionHintParser implements Parser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return [{ topic, data: thriftRead(payload).find(x => x.type === ThriftTypes.BINARY && x.field === 1).value }];
    }
}
