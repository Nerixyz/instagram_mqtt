import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../../topic";
import {thriftRead, ThriftTypes} from "../../thrift";

export class GraphqlParser implements IParser {
    parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        const msg = thriftRead(payload);

        return [{topic,
            data: {
                topic: msg.find(x => x.field === 1 && x.type === ThriftTypes.BINARY).value,
                payload: msg.find(x => x.field === 2 && x.type === ThriftTypes.BINARY)
            }
        }];
    }

}
