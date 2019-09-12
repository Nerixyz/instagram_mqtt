import {MqttPacket} from "../mqtt.packet";
import {PacketTypes} from "../mqtt.constants";
import {PacketStream} from "../packet-stream";
import {MqttMessage} from "../mqtt.message";

const {random, defaults} = require('lodash');

export class ConnectRequestPacket extends MqttPacket {
    public options: ConnectRequestOptions;

    constructor(options?: ConnectRequestOptions) {
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
        if(!options)
            return 0;

        let flags = 0;
        if(options.username)
            flags |= 0x1 << 7;
        if(options.password)
            flags |= 0x1 << 6;
        if(options.will){
            if(options.will.retained)
                flags |= 0x1 << 5;

            flags |= (options.will.qosLevel & 0x03) << 3;
            flags |= 0x1 << 2;
        }
        if(options.clean)
            flags |= 0x1 << 1;

        return flags;
    }

    write(stream: PacketStream): void {
        const {protocolLevel, protocolName, flags, clientId, keepAlive, will, username, password} = this.options;
        const data = new PacketStream().writeString(protocolName).writeByte(protocolLevel).writeByte(flags).writeWord(keepAlive).writeString(clientId);
        if(will)
            data.writeString(will.topic).writeString(will.payload);
        if(username)
            data.writeString(username);
        if(password)
            data.writeString(password);
        this.remainingPacketLength = data.length;
        super.write(stream);

        stream.write(data.data);
    }
}

export interface ConnectRequestOptions {
    protocolLevel?: number,
    protocolName?: string,
    flags?: number,
    clientId?: string,
    keepAlive?: number,
    will?: MqttMessage,
    username?: string,
    password?: string,
    clean?: boolean,
}
