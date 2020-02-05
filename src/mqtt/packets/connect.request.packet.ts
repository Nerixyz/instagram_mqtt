import { MqttPacket } from '../mqtt.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';
import { MqttMessage } from '../mqtt.message';
import { defaults, random } from 'lodash';

export class ConnectRequestPacket extends MqttPacket {
    public options: ConnectRequestOptions;

    public constructor(options?: ConnectRequestOptions) {
        super(PacketTypes.TYPE_CONNECT);

        this.options = defaults(options, {
            protocolLevel: 3,
            protocolName: 'MQTT',
            flags: ConnectRequestPacket.makeFlags(options),
            clientId: 'mqtt_' + random(0, 200000),
            keepAlive: 60,
        });
    }

    private static makeFlags(options?: ConnectRequestOptions): number {
        if (!options) return 0;

        let flags = 0;
        if (options.username) flags |= 0x1 << 7;
        if (options.password) flags |= 0x1 << 6;
        if (options.will) {
            if (options.will.retained) flags |= 0x1 << 5;

            flags |= ((options.will.qosLevel ?? 0) & 0x03) << 3;
            flags |= 0x1 << 2;
        }
        if (options.clean) flags |= 0x1 << 1;

        return flags;
    }

    public write(stream: PacketStream): void {
        const { protocolLevel, protocolName, flags, clientId, keepAlive, will, username, password } = this.options;
        const data = PacketStream.empty()
            .writeString(protocolName ?? 'MQTT')
            .writeByte(protocolLevel ?? 3)
            .writeByte(flags ?? ConnectRequestPacket.makeFlags(this.options))
            .writeWord(keepAlive ?? 60)
            .writeString(clientId ?? 'mqtt_' + random(0, 200000));

        if (will) data.writeString(will.topic).writeString(will.payload.toString());
        if (username) data.writeString(username);
        if (password) data.writeString(password);
        this.remainingPacketLength = data.length;
        super.write(stream);

        stream.write(data.data);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        //this.assertPacketFlags(0);
        this.assertRemainingPacketLength();

        this.options.protocolName = stream.readString();
        this.assertValidString(this.options.protocolName);
        this.options.protocolLevel = stream.readByte();
        this.options.flags = stream.readByte();
        this.options.keepAlive = stream.readWord();
        this.options.clientId = stream.readString();
        this.assertValidString(this.options.clientId);

        if ((this.options.flags & (0x1 << 2)) !== 0) {
            this.options.will = {
                topic: stream.readString(),
                payload: Buffer.from(stream.readString()),
            };
        }

        if ((this.options.flags & (0x1 << 7)) !== 0) {
            this.options.username = stream.readString();
            this.assertValidString(this.options.username);
        }

        if ((this.options.flags & (0x1 << 6)) !== 0) {
            this.options.password = stream.readString();
            this.assertValidString(this.options.password);
        }
    }
}

export interface ConnectRequestOptions {
    protocolLevel?: number;
    protocolName?: string;
    flags?: number;
    clientId?: string;
    keepAlive?: number;
    will?: MqttMessage;
    username?: string;
    password?: string;
    clean?: boolean;
}
