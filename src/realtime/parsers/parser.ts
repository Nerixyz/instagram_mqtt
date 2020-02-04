import { Topic } from '../../topic';

export interface Parser<T> {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage<T>[] | ParsedMessage<T>;
}
export interface ParsedMessage<T> {
    topic: Topic;
    data: T;
}
