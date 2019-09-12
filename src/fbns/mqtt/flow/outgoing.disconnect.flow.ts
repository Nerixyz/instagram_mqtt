import {PacketFlow} from "./packet-flow";
import {ConnectRequestOptions} from "../packets/connect.request.packet";
import {MqttPacket} from "../mqtt.packet";
import {DisconnectRequestPacket} from "../packets/disconnect.request.packet";

export class OutgoingDisconnectFlow extends PacketFlow<ConnectRequestOptions>{

    private connection: ConnectRequestOptions;

    constructor(connection: ConnectRequestOptions) {
        super();
        this.connection = connection;
    }

    accept(packet: MqttPacket): boolean {
        return false;
    }

    get name(): string {
        return "disconnect";
    }

    next(packet: MqttPacket): MqttPacket {
        return undefined;
    }

    start(): MqttPacket {
        this.succeeded(this.connection);
        return new DisconnectRequestPacket();
    }

}
