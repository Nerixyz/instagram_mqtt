import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../topic";
import {fbnsRead, FbnsTypes} from "../fbns-reader";

export class GraphqlParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        const msg = fbnsRead(payload);

        return [{topic,
            data: {
                topic: msg.find(x => x.field === 1 && x.type === FbnsTypes.BINARY).value,
                payload: msg.find(x => x.field === 2 && x.type === FbnsTypes.BINARY)
            }
        }];
    }

}
