import {IgApiClient} from "instagram-private-api";
import {FBNS} from "../constants";
import {FbnsDeviceAuth} from "./fbns.device-auth";
import {compressDeflate, createUserAgent} from "../shared";
import {FbnsConnection} from "./fbns.connection";
import {createConnection, Socket} from "net";
import {numbers} from "./numbers";
import {MqttClient} from "./mqtt/mqtt.client";
import {ConnectRequestOptions} from "./mqtt/packets/connect.request.packet";
import {PacketFlow} from "./mqtt/flow/packet-flow";
import {MqttPacket} from "./mqtt/mqtt.packet";
import {PacketTypes} from "./mqtt/mqtt.constants";
import {FbnsConnectRequestPacket} from "./fbns.connect-request.packet";
import { deflateSync } from "zlib";
import {EventEmitter} from "events";

export class FbnsClient extends EventEmitter {
    private client: CustomMqttClient;
    private ig: IgApiClient;
    private conn: FbnsConnection;

    constructor(ig: IgApiClient){
        super();
        this.ig = ig;
        this.conn = new FbnsConnection(new FbnsDeviceAuth(this.ig), createUserAgent(this.ig));
        this.client = new CustomMqttClient({
            url: FBNS.HOST_NAME_V6,
            payload: deflateSync(this.conn.toString(), {level: 9}),
        });
        this.client.on('message', (msg) => {
            console.log(msg);
            this.emit('message');
        });
        this.client.on('warning', console.error);
        this.client.on('error', console.error);
        this.client.on('open', () => console.log('open'));
        this.connect().catch(console.error);
    }

    public async connect() {
        this.client.connect({
            keepAlive: 900,
            protocolName: 'MQIsdp',
            protocolLevel: 3,
            clientId: this.ig.state.phoneId.substr(0, 20),
            clean: true
        });
    }
}

class CustomMqttClient extends MqttClient {

    protected fbnsPayload: Buffer;

    constructor(options: {url: string, payload: Buffer}) {
        super({url: options.url});
        this.fbnsPayload = options.payload;
    }

    protected registerClient(options: ConnectRequestOptions) {
        this.startFlow(new FbnsConnectFlow(this.fbnsPayload));
    }
}

class FbnsConnectFlow extends PacketFlow<any> {

    private payload: Buffer;

    constructor(payload: Buffer) {
        super();
        this.payload = payload;
    }

    accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    get name(): string {
        return "fbnsConnect";
    }

    next(packet: MqttPacket): MqttPacket {
        console.log('next');
        this.succeeded(undefined);
        return undefined;
    }

    start(): MqttPacket {
        console.log('start');
        return new FbnsConnectRequestPacket(this.payload);
    }

}


