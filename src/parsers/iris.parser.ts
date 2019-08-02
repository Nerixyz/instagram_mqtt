import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../topic";

export class IrisParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return (JSON.parse(payload.toString('UTF-8')) as any[]).map(x => ({topic, data: x}));
    }

}
