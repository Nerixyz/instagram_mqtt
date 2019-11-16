import { Topic } from '../../topic';

export interface Parser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage<any>[];
}
export interface ParsedMessage<T> {
    topic: Topic;
    data: T;
}
