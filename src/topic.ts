import { Parser } from './realtime/parsers';

export interface Topic<T = unknown> {
    id: string,
    path: string,
    parser: null | Parser<T>,
    noParse?: boolean;
}
