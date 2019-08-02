import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../topic";
import {fbnsRead, FbnsTypes} from "../fbns-reader";

export class SkywalkerParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        const msg = fbnsRead(payload);
        return [{topic,
            data: {
                topic: msg.find(x => x.type === FbnsTypes.INT_32 && x.field === 1).value,
                payload: JSON.parse(msg.find(x => x.type === FbnsTypes.BINARY && x.field === 2).value)
            }
        }];
    }
}
