import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftPacketDescriptor, ThriftDescriptors, thriftReadToObject } from '../../thrift';

export class GraphqlParser implements Parser {
    public static descriptors: ThriftPacketDescriptor[] = [
        ThriftDescriptors.binary('topic', 1),
        ThriftDescriptors.binary('payload', 2),
    ];

    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<GraphQlMessage>[] {
        const msg = thriftReadToObject<GraphQlMessage>(payload, GraphqlParser.descriptors);
        if (msg.payload?.match(/[{[]/)) {
            msg.json = JSON.parse(msg.payload);
        }
        // @ts-ignore - msg is a GraphQlMessage
        return [{ topic, data: msg }];
    }
}

export interface GraphQlMessage {
    topic: string;
    payload: string;
    json?: any;
}
