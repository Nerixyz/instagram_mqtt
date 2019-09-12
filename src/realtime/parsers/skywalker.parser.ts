import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../../topic";
import {thriftRead, ThriftTypes} from "../../thrift/thrift";

export class SkywalkerParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        const msg = thriftRead(payload);
        return [{topic,
            data: {
                topic: msg.find(x => x.type === ThriftTypes.INT_32 && x.field === 1).value,
                payload: JSON.parse(msg.find(x => x.type === ThriftTypes.BINARY && x.field === 2).value)
            }
        }];
    }
}
