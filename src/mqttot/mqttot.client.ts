import { MQTToTConnectRequestPacket } from './mqttot.connect-request-packet';
import { compressDeflate, debugChannel } from '../shared';
import * as URL from 'url';
import {
    ConnectRequestOptions,
    ConnectResponsePacket,
    isConnAck,
    MqttClient,
    MqttMessage,
    PacketFlowFunc,
    PacketTypes,
} from 'mqtts';

export class MQTToTClient extends MqttClient {
    protected connectPayloadProvider: () => Promise<Buffer>;
    protected connectPayload: Buffer;

    protected mqttotDebug: (msg: string) => void;

    public constructor(options: {
        url: string;
        payloadProvider: () => Promise<Buffer>;
        enableTrace?: boolean;
        autoReconnect: boolean;
    }) {
        super({ url: options.url, enableTrace: options.enableTrace, autoReconnect: options.autoReconnect });
        this.mqttotDebug = (msg: string, ...args: string[]) =>
            debugChannel('mqttot')(`${URL.parse(options.url).host}: ${msg}`, ...args);
        this.connectPayloadProvider = options.payloadProvider;
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
        this.$disconnect.subscribe(e => this.mqttotDebug(`Disconnected. ${e}`));
    }

    async connect(options?: ConnectRequestOptions): Promise<any> {
        this.connectPayload = await this.connectPayloadProvider();
        return super.connect(options);
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
    return (success, error) => ({
        start: () => new MQTToTConnectRequestPacket(payload),
        accept: isConnAck,
        next: (packet: ConnectResponsePacket) => {
            if (packet.isSuccess) {
                if (packet.payload?.length) success(packet);
                else error(new Error(`CONNACK: no payload: ${packet.payload}`));
            } else error(new Error(`CONNACK returnCode: ${packet.returnCode} errorName: ${packet.errorName}`));
        },
    });
}
