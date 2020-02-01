import { PacketFlow } from './packet-flow';
import { MqttPacket } from '../mqtt.packet';
import { PingRequestPacket } from '../packets';
import { PacketTypes } from '../mqtt.constants';

export class OutgoingPingFlow extends PacketFlow<undefined> {
    public accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_PINGRESP;
    }

    public get name(): string {
        return 'ping';
    }

    public next(): undefined {
        this.succeeded(undefined);
        return undefined;
    }

    public start(): MqttPacket {
        return new PingRequestPacket();
    }
}
