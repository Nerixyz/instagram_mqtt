import {PacketFlow} from "./packet-flow";
import {MqttPacket} from "../mqtt.packet";
import {PacketTypes} from "../mqtt.constants";
import {ConnectRequestOptions, ConnectRequestPacket} from "../packets/connect.request.packet";
import {ConnectResponsePacket} from "../packets/connect.response.packet";

const {defaults, random} = require('lodash');

export class OutgoingConnectFlow extends PacketFlow<ConnectRequestOptions> {

    private readonly options: ConnectRequestOptions;

    constructor(options: ConnectRequestOptions) {
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

    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    get name(): string {
        return "connect";
    }

    next(packet: MqttPacket): MqttPacket {
        const response = (packet as ConnectResponsePacket);
        if(response.isSuccess){
            this.succeeded(this.options);
        }else {
            this.errored(response.errorName);
        }
        return undefined;
    }

    start(): MqttPacket {
        return  new ConnectRequestPacket(this.options);
    }

}
