import {IParser} from "./parsers/parser";

export interface Topic {
    id: string;
    path: string;
    parser: IParser;
}
