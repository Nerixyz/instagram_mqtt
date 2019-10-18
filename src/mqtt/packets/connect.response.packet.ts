import {MqttPacket} from "../mqtt.packet";
import {PacketStream} from "../packet-stream";
import {PacketTypes} from "../mqtt.constants";

export class ConnectResponsePacket extends MqttPacket {
    get payload(): Buffer {
        return this._payload;
    }

    public static readonly returnCodes = [
        'Connection accepted',
        'Unacceptable protocol version',
        'Identifier rejected',
        'Server unavailable',
        'Bad user name or password',
        'Not authorized'
    ];

    get returnCode(): number {
        return this._returnCode;
    }
    get flags(): number {
        return this._flags;
    }
    get isSuccess(): boolean {
        return this.returnCode === 0;
    }
    get isError(): boolean {
        return this.returnCode > 0;
    }
    get errorName(): string {
        return ConnectResponsePacket.returnCodes[Math.min(this.returnCode, ConnectResponsePacket.returnCodes.length -1)];
    }
    private _flags: number;
    private _returnCode: number;

    private _payload: Buffer;

    constructor() {super(PacketTypes.TYPE_CONNACK)}

    read(stream: PacketStream): void {
        super.read(stream);

        this._flags = stream.readByte();
        this._returnCode = stream.readByte();
        if(this.remainingPacketLength > 0) {
            this._payload = stream.readStringAsBuffer();
        }
    }
}
