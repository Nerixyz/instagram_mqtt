import { Topic } from '../../topic';

export interface Parser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[];
}
export interface ParsedMessage {
    topic: Topic;
    data;
}
