import {IParser} from "./realtime/parsers/parser";

export interface Topic {
    id: string;
    path: string;
    parser: IParser;
}
