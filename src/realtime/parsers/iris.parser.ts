import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';

/*eslint @typescript-eslint/interface-name-prefix: "off" */
export class IrisParser implements Parser {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<IrisParserData>[] {
        return JSON.parse(payload.toString('UTF-8')).map(x => ({ topic, data: x }));
    }
}

export interface IrisParserData {
    event: 'patch' | string;
    data: any[];
    message_type: number;
    seq_id: number;
    mutation_token: null | string;
    realtime: boolean;
    sampled?: boolean;
}
