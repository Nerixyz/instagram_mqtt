import { EventEmitter } from "events";
import {Socket} from "net";
import * as url from "url";

export class FbnsSocket extends EventEmitter {
    private socket: Socket;

    constructor(path: string) {
        super();
        const parts = url.parse(path, true);
        this.socket = new Socket({}).connect({
            port: Number(parts.port),
            path: parts.path,
        });
        this.socket.on('connect', () => {
            console.log('connect');
        });
        this.socket.on('error', (e) => {
            console.error(e);
        });
        this.socket.on('end', () => {

        });

        this.socket.on('data', (buf) => {
            console.log(buf.toString());
        });
    }


}
