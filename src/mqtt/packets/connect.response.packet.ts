import { MqttPacket } from '../mqtt.packet';
import { PacketStream } from '../packet-stream';
import { PacketTypes } from '../mqtt.constants';

export class ConnectResponsePacket extends MqttPacket {
    public get payload(): Buffer {
        return this._payload;
    }

    public static readonly returnCodes = [
        'Connection accepted',
        'Unacceptable protocol version',
        'Identifier rejected',
        'Server unavailable',
        'Bad user name or password',
        'Not authorized',
    ];

    public get returnCode(): number {
        return this._returnCode;
    }
    public get flags(): number {
        return this._flags;
    }
    public get isSuccess(): boolean {
        return this.returnCode === 0;
    }
    public get isError(): boolean {
        return this.returnCode > 0;
    }
    public get errorName(): string {
        return ConnectResponsePacket.returnCodes[
            Math.min(this.returnCode, ConnectResponsePacket.returnCodes.length - 1)
        ];
    }
    private _flags: number;
    private _returnCode: number;

    private _payload: Buffer;

    public constructor() {
        super(PacketTypes.TYPE_CONNACK);
    }

    public read(stream: PacketStream): void {
        super.read(stream);

        this._flags = stream.readByte();
        this._returnCode = stream.readByte();
        /**
         * It should be noted that the MQTT 3(.11) standard does not specify a payload to be sent wit a CONNACK packet,
         * but facebook being facebook added a payload to this response instead of publishing on a topic.
         * So, I added this payload to the normal CONNACK to avoid duplicate code.
         * But if anyone ever tries to implement this, the payload isn't part of regular MQTT traffic.
         */
        if (this.remainingPacketLength - 2 > 0) {
            this._payload = stream.readStringAsBuffer();
        }
    }
}
