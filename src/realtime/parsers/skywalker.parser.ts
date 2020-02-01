import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftDescriptors, ThriftToObjectResult, thriftReadToObject } from '../../thrift';

export class SkywalkerParser implements Parser {
    public static descriptors = [ThriftDescriptors.int32('topic', 1), ThriftDescriptors.binary('payload', 2)];

    public parseMessage(
        topic: Topic,
        payload: Buffer,
    ): ParsedMessage<ThriftToObjectResult<{ topic: number; payload: string }>>[] {
        return [
            {
                topic,
                data: thriftReadToObject(payload, SkywalkerParser.descriptors),
            },
        ];
    }
}
