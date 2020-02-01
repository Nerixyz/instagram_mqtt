import { PacketFlow } from './packet-flow';
import { ConnectRequestOptions } from '../packets';
import { MqttPacket } from '../mqtt.packet';
import { DisconnectRequestPacket } from '../packets';

export class OutgoingDisconnectFlow extends PacketFlow<ConnectRequestOptions> {
    private readonly connection: ConnectRequestOptions;

    public constructor(connection: ConnectRequestOptions) {
        super();
        this.connection = connection;
    }

    public accept(): boolean {
        return false;
    }

    public get name(): string {
        return 'disconnect';
    }

    public next(): undefined {
        return undefined;
    }

    public start(): MqttPacket {
        this.succeeded(this.connection);
        return new DisconnectRequestPacket();
    }
}
