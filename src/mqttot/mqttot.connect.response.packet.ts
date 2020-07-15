import { ConnectResponsePacket, PacketStream, ConnectReturnCode } from 'mqtts';

export class MQTToTConnectResponsePacket extends ConnectResponsePacket {
  constructor(ackFlags: number, returnCode: ConnectReturnCode, public readonly payload: Buffer) {
    super(ackFlags, returnCode);
  }
}

export function readConnectResponsePacket(stream: PacketStream, remaining: number): MQTToTConnectResponsePacket {
  const ack = stream.readByte();
  const returnCode = stream.readByte();
  if(ack > 1) {
    throw new Error('Invalid ack');
  } else if(returnCode > 5) {
    throw new Error('Invalid return code');
  }
  return new MQTToTConnectResponsePacket(ack, returnCode as ConnectReturnCode, remaining > 2 ? stream.readStringAsBuffer() : Buffer.alloc(0));
}