import {Topic} from "../../topic";

export interface IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[];
}
export interface ParsedMessage {
    topic: Topic;
    data: any;
}
