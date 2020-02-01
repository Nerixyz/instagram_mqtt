import { IdentifiableBasePacket } from './identifiable.packet';
import { PacketTypes } from '../mqtt.constants';
import { PacketStream } from '../packet-stream';

export class SubscribeResponsePacket extends IdentifiableBasePacket {
    public get returnCodes(): number[] {
        return this._returnCodes;
    }

    public set returnCodes(value: number[]) {
        value.forEach(e => this.assertValidReturnCode(e));
        this._returnCodes = value;
    }

    private static readonly qosLevels = {
        q0: 'Max QoS 0',
        q1: 'Max QoS 1',
        q2: 'Max QoS 2',
        q128: 'Failure',
    };

    private _returnCodes: number[];

    public constructor() {
        super(PacketTypes.TYPE_SUBACK);
    }

    public read(stream: PacketStream): void {
        super.read(stream);
        this.assertPacketFlags(0);
        this.assertRemainingPacketLength();

        this.identifier = stream.readWord();

        const returnCodeLen = this.remainingPacketLength - 2;
        this._returnCodes = [];
        for (let i = 0; i < returnCodeLen; i++) {
            const code = stream.readByte();
            this.assertValidReturnCode(code);
            this._returnCodes.push(code);
        }
    }

    public write(stream: PacketStream): void {
        const data = PacketStream.empty().writeWord(this.generateIdentifier());
        this._returnCodes.forEach(c => data.writeByte(c));

        this.remainingPacketLength = data.length;
        super.write(stream);
        stream.write(data.data);
    }

    public isError(returnCode: number) {
        return returnCode === 128;
    }

    public getReturnCodeName(returnCode: 0 | 1 | 2 | 128) {
        // @ts-ignore - this is valid
        return SubscribeResponsePacket.qosLevels[`q${returnCode.toString()}`];
    }

    protected assertValidReturnCode(returnCode: number) {
        if (returnCode & 0b0111_1100) {
            throw new Error(`Invalid return code: ${returnCode}`);
        }
    }

    protected getExpectedPacketFlags(): number {
        return 0;
    }
}
