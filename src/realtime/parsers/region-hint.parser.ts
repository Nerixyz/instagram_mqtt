import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftToObjectResult, ThriftDescriptors, thriftReadToObject } from '../../thrift';

export class RegionHintParser implements Parser<ThriftToObjectResult<{ hint: string }>> {
    public static descriptors = [ThriftDescriptors.binary('hint', 1)];

    public parseMessage = (topic: Topic, payload: Buffer): ParsedMessage<ThriftToObjectResult<{ hint: string }>> => ({
        topic,
        data: thriftReadToObject(payload, RegionHintParser.descriptors),
    });
}
