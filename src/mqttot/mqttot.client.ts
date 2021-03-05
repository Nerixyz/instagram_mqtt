import { compressDeflate, debugChannel } from '../shared';
import { MQTToTConnectPacketOptions, writeConnectRequestPacket } from './mqttot.connect.request.packet';
import {
    ConnectRequestOptions,
    DefaultPacketReadMap,
    DefaultPacketReadResultMap,
    DefaultPacketWriteMap,
    DefaultPacketWriteOptions,
    isConnAck,
    MqttClient,
    MqttMessage,
    MqttMessageOutgoing,
    PacketFlowFunc,
    PacketType, SocksTlsTransport, TlsTransport
} from 'mqtts';
import { ConnectionFailedError, EmptyPacketError } from '../errors';
import { MQTToTConnectResponsePacket, readConnectResponsePacket } from './mqttot.connect.response.packet';
import { SocksProxy } from 'socks';
import {ConnectionOptions} from 'tls';

type MQTToTReadMap = Omit<DefaultPacketReadResultMap, PacketType.ConnAck> & {
    [PacketType.ConnAck]: MQTToTConnectResponsePacket;
};
type MQTToTWriteMap = Omit<DefaultPacketWriteOptions, PacketType.Connect> & {
    [PacketType.Connect]: MQTToTConnectPacketOptions;
};

export class MQTToTClient extends MqttClient<MQTToTReadMap, MQTToTWriteMap> {
    protected connectPayloadProvider: () => Promise<Buffer>;
    protected connectPayload: Buffer;
    protected requirePayload: boolean;

    protected mqttotDebug: (msg: string) => void;

    public constructor(options: {
        url: string;
        payloadProvider: () => Promise<Buffer>;
        enableTrace?: boolean;
        autoReconnect: boolean;
        requirePayload: boolean;
        socksOptions?: SocksProxy;
        additionalOptions?: ConnectionOptions
    }) {
        super({
            autoReconnect: options.autoReconnect,
            readMap: {
                ...DefaultPacketReadMap,
                [PacketType.ConnAck]: readConnectResponsePacket,
            },
            writeMap: {
                ...DefaultPacketWriteMap,
                [PacketType.Connect]: writeConnectRequestPacket,
            },
            transport: options.socksOptions ? new SocksTlsTransport({
                host: options.url,
                port: 443,
                proxyOptions: options.socksOptions,
                additionalOptions: options.additionalOptions
            }) : new TlsTransport({
                host: options.url,
                port: 443,
                additionalOptions: options.additionalOptions
            }),
        });
        this.mqttotDebug = (msg: string, ...args: string[]) =>
            debugChannel('mqttot')(`${options.url}: ${msg}`, ...args);
        this.connectPayloadProvider = options.payloadProvider;
        this.mqttotDebug(`Creating client`);
        this.registerListeners();
        this.requirePayload = options.requirePayload;
    }

    protected registerListeners() {
        const printErrorOrWarning = (type: string) => (e: Error | string) => {
            if (typeof e === 'string') {
                this.mqttotDebug(`${type}: ${e}`);
            } else {
                this.mqttotDebug(`${type}: ${e.message}\n\tStack: ${e.stack}`);
            }
        };
        this.on('error', printErrorOrWarning('Error'));
        this.on('warning', printErrorOrWarning('Warning'));
        this.on('disconnect', e => this.mqttotDebug(`Disconnected. ${e}`));
    }

    async connect(options?: ConnectRequestOptions): Promise<any> {
        this.connectPayload = await this.connectPayloadProvider();
        return super.connect(options);
    }

    protected getConnectFlow(): PacketFlowFunc<MQTToTReadMap, MQTToTWriteMap, any> {
        return mqttotConnectFlow(this.connectPayload, this.requirePayload);
    }

    /**
     * Compresses the payload
     * @param {MqttMessage} message
     * @returns {Promise<MqttMessageOutgoing>}
     */
    public async mqttotPublish(message: MqttMessage): Promise<MqttMessageOutgoing> {
        this.mqttotDebug(`Publishing ${message.payload.byteLength}bytes to topic ${message.topic}`);
        return await this.publish({
            topic: message.topic,
            payload: await compressDeflate(message.payload),
            qosLevel: message.qosLevel,
        });
    }
}

export function mqttotConnectFlow(
    payload: Buffer,
    requirePayload: boolean,
): PacketFlowFunc<MQTToTReadMap, MQTToTWriteMap, MQTToTConnectResponsePacket> {
    return (success, error) => ({
        start: () => ({
            type: PacketType.Connect,
            options: {
                payload,
                keepAlive: 60,
            },
        }),
        accept: isConnAck,
        next: (packet: MQTToTConnectResponsePacket) => {
            if (packet.isSuccess) {
                if (packet.payload?.length || !requirePayload) success(packet);
                else error(new EmptyPacketError(`CONNACK: no payload (payloadExpected): ${packet.payload}`));
            } else
                error(
                    new ConnectionFailedError(
                        `CONNACK returnCode: ${packet.returnCode} errorName: ${packet.errorName}`,
                    ),
                );
        },
    });
}
