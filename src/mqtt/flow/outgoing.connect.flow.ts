import { PacketFlow } from './packet-flow';
import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import { ConnectRequestOptions, ConnectRequestPacket } from '../packets';
import { ConnectResponsePacket } from '../packets';

import { defaults, random } from 'lodash';

export class OutgoingConnectFlow extends PacketFlow<ConnectRequestOptions> {
    private readonly options: ConnectRequestOptions;

    public constructor(options: ConnectRequestOptions) {
        super();
        this.options = defaults(options, {
            protocol: 3,
            clientId: 'mqtt_' + random(1, 100000),
            cleanSession: true,
            username: undefined,
            password: undefined,
            will: undefined,
            keepAlive: 60,
        });
    }

    public accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    public get name(): string {
        return 'connect';
    }

    public next(packet: MqttPacket): undefined {
        const response = packet as ConnectResponsePacket;
        if (response.isSuccess) {
            this.succeeded(this.options);
        } else {
            this.errored(response.errorName);
        }
        return undefined;
    }

    public start(): MqttPacket {
        return new ConnectRequestPacket(this.options);
    }
}
