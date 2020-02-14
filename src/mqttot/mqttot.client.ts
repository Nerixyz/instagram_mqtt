import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { compressDeflate, debugChannel } from '../shared';
import * as URL from 'url';
import { ConnectResponsePacket, MqttClient, MqttMessage, MqttPacket, PacketFlowFunc, PacketTypes } from 'mqtts';

export class MQTToTClient extends MqttClient {
    protected connectPayload: Buffer;

    protected mqttotDebug: (msg: string) => void;

    public constructor(options: { url: string; payload: Buffer; enableTrace?: boolean }) {
        super({ url: options.url, enableTrace: options.enableTrace });
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

    protected getConnectFlow(): PacketFlowFunc<any> {
        return mqttotConnectFlow(this.connectPayload);
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

export function mqttotConnectFlow(payload: Buffer): PacketFlowFunc<ConnectResponsePacket> {
    return success => ({
        start: () => new MQTToTConnectRequestPacket(payload),
        accept: packet => packet.packetType === PacketTypes.TYPE_CONNACK,
        next: (packet: ConnectResponsePacket) => success(packet)
    })
}
