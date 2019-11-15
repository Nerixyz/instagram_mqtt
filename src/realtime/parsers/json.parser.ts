import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';

export class JsonParser implements Parser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return [{ topic, data: payload.length > 0 ? JSON.parse(payload.toString()) : {} }];
    }
}
