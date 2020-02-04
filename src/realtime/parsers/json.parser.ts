import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';

export class JsonParser implements Parser<any> {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<any> {
        return { topic, data: payload.length > 0 ? JSON.parse(payload.toString()) : {} };
    }
}
