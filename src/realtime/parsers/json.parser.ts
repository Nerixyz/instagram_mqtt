import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../../topic";

export class JsonParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return [{topic, data: JSON.parse(payload.toString())}];
    }

}
