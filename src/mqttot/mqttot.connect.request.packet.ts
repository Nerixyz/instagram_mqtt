import { PacketStream, PacketWriteResult } from 'mqtts';

export interface MQTToTConnectPacketOptions {
    keepAlive: number;
    payload: Buffer;
}
export function writeConnectRequestPacket(stream:PacketStream, options: MQTToTConnectPacketOptions): PacketWriteResult {
   stream
      .writeString('MQTToT')
      .writeByte(3)
      .writeByte(194)
      .writeWord(options.keepAlive)
      .write(options.payload);
   return  {};
}
