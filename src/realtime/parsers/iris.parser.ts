import { ParsedMessage, Parser } from './parser';
import { Topic } from '../../topic';

export class IrisParser implements Parser<IrisParserData> {
    public parseMessage(topic: Topic, payload: Buffer): ParsedMessage<IrisParserData>[] {
        return JSON.parse(payload.toString('utf8')).map((x: IrisParserData) => ({ topic, data: x }));
    }
}

export interface IrisParserData {
    event: 'patch' | string;
    data?: any[];
    message_type: number;
    seq_id: number;
    mutation_token: null | string;
    realtime: boolean;
    op?: 'add' | 'replace' | string;
    path?: string;
    sampled?: boolean;
}
