import { Transport } from './transport';
import { TLSSocket, connect } from 'tls';
import * as URL from 'url';

export class TlsTransport extends Transport<{ url: string; enableTrace: boolean }> {
    private socket: TLSSocket;
    send(data: Buffer): void {
        this.socket.write(data);
    }

    connect(): void {
        const url = URL.parse(this.options.url);
        this.socket = connect({
            host: url.hostname ?? '',
            port: Number(url.port),
            enableTrace: this.options.enableTrace,
            timeout: 0,
        });
        this.socket.on('error', e => this.callbacks.error(e));
        this.socket.on('end', () => this.callbacks.disconnect());
        this.socket.on('close', () => this.callbacks.disconnect());
        this.socket.on('secureConnect', () => this.callbacks.connect());
        this.socket.on('timeout', () => this.callbacks.disconnect());
        this.socket.on('data', res => this.callbacks.data(res));
    }
}
