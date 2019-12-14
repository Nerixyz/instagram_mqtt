import { Parser } from './realtime/parsers';

export interface Topic {
    id: string;
    path: string;
    parser?: Parser;
}
