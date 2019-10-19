import { PacketFlow } from './packet-flow';
import { MqttPacket } from '../mqtt.packet';
import { PingResponsePacket } from '../packets';

export class IncomingPingFlow extends PacketFlow<object> {
    public accept(): boolean {
        return false;
    }

    public get name(): string {
        return 'pong';
    }

    public next(): MqttPacket {
        return undefined;
    }

    public start(): MqttPacket {
        this.succeeded(undefined);
        return new PingResponsePacket();
    }
}
