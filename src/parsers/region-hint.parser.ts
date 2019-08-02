import {IParser, ParsedMessage} from "./parser";
import {fbnsRead, FbnsTypes} from "../fbns-reader";
import {Topic} from "../topic";

export class RegionHintParser implements IParser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return [{topic, data: fbnsRead(payload).find(x => x.type === FbnsTypes.BINARY && x.field === 1).value}];
    }

}
