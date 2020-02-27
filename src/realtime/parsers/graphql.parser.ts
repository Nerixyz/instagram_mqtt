import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';
import { ThriftPacketDescriptor, ThriftDescriptors, thriftReadToObject } from '../../thrift';
import { isJson } from '../../shared';

export class GraphqlParser implements Parser<GraphQlMessage> {
    public static descriptors: ThriftPacketDescriptor[] = [
        ThriftDescriptors.binary('topic', 1),
        ThriftDescriptors.binary('payload', 2),
    ];

    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<GraphQlMessage> {
        const message: any = isJson(payload)
            ? payload.toString()
            : thriftReadToObject<{ payload: string; topic: string }>(payload, GraphqlParser.descriptors) ?? '';
        if (message.payload) {
            message.json = JSON.parse(message.payload);
        }
        return { topic, data: { message } };
    }
}

export interface GraphQlMessage {
    message: string | { topic: string; payload: string; json: any };
}
