import { MqttClient } from '../mqtt';
import { PacketFlow } from '../mqtt/flow';
import { MqttPacket, MqttMessage, PacketTypes } from '../mqtt';
import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { compressDeflate, debugChannel } from '../shared';
import { ConnectResponsePacket } from '../mqtt/packets';
import * as URL from 'url';

export class MQTToTClient extends MqttClient {
    protected connectPayload: Buffer;

    protected mqttotDebug: (msg: string) => void;

    public constructor(options: { url: string; payload: Buffer }) {
        super({ url: options.url });
        this.mqttotDebug = (msg: string, ...args: string[]) =>
            debugChannel('mqttot')(`${URL.parse(options.url).host}: ${msg}`, ...args);
        this.connectPayload = options.payload;
        this.mqttotDebug(`Creating client`);
        this.registerListeners();
        this.state.connectOptions = { keepAlive: 60 };
    }

    protected registerListeners() {
        const printErrorOrWarning = (type: string) => (e: Error | string) => {
            if (typeof e === 'string') {
                this.mqttotDebug(`${type}: ${e}`);
            } else {
                this.mqttotDebug(`${type}: ${e.message}\n\tStack: ${e.stack}`);
            }
        };
        this.$warning.subscribe(printErrorOrWarning('Error'));
        this.$error.subscribe(printErrorOrWarning('Warning'));
        this.$disconnect.subscribe(() => this.mqttotDebug('Disconnected.'));
    }

    protected getConnectFlow(): PacketFlow<any> {
        return new MQTToTConnectFlow(this.connectPayload);
    }

    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<void>}
     */
    public async mqttotPublish(message: MqttMessage) {
        this.mqttotDebug(`Publishing ${message.payload.byteLength}bytes to topic ${message.topic}`);
        this.publish({
            topic: message.topic,
            payload: await compressDeflate(message.payload),
            qosLevel: message.qosLevel,
        });
    }
}

export class MQTToTConnectFlow extends PacketFlow<ConnectResponsePacket> {
    private readonly payload: Buffer;

    public constructor(payload: Buffer) {
        super();
        this.payload = payload;
    }

    public accept(packet: MqttPacket): boolean {
        return packet.packetType === PacketTypes.TYPE_CONNACK;
    }

    public get name(): string {
        return 'mqttotConnect';
    }

    public next(packet: ConnectResponsePacket): undefined {
        this.succeeded(packet);
        return undefined;
    }

    public start(): MqttPacket {
        return new MQTToTConnectRequestPacket(this.payload);
    }
}
