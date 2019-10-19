import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';

/*eslint @typescript-eslint/interface-name-prefix: "off" */
export class IrisParser implements Parser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage[] {
        return JSON.parse(payload.toString('UTF-8')).map(x => ({ topic, data: x }));
    }
}
