import {IParser, ParsedMessage} from "./parser";
import {Topic} from "../../topic";
import {thriftRead, ThriftTypes} from "../../thrift/thrift";

export class RegionHintParser implements IParser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return [{topic, data: thriftRead(payload).find(x => x.type === ThriftTypes.BINARY && x.field === 1).value}];
    }

}
