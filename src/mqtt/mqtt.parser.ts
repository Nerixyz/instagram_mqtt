import { MqttPacket } from './mqtt.packet';
import { PacketTypes } from './mqtt.constants';
import { PacketStream } from './packet-stream';
import Bluebird = require('bluebird');
import { EndOfStreamError } from './errors';
import {
    ConnectRequestPacket,
    ConnectResponsePacket,
    DisconnectRequestPacket,
    PingRequestPacket,
    PingResponsePacket,
    PublishAckPacket,
    PublishCompletePacket,
    PublishReceivedPacket,
    PublishReleasePacket,
    PublishRequestPacket,
    SubscribeRequestPacket,
    SubscribeResponsePacket,
    UnsubscribeRequestPacket,
    UnsubscribeResponsePacket,
} from './packets';

export class MqttParser {
    protected stream: PacketStream;
    protected errorCallback: (e: Error) => void;

    public mapping: { type: number; packet: () => MqttPacket }[] = [
        {
            type: PacketTypes.TYPE_CONNECT,
            packet: () => new ConnectRequestPacket(),
        },
        {
            type: PacketTypes.TYPE_CONNACK,
            packet: () => new ConnectResponsePacket(),
        },
        {
            type: PacketTypes.TYPE_PUBLISH,
            packet: () => new PublishRequestPacket(),
        },
        {
            type: PacketTypes.TYPE_PUBACK,
            packet: () => new PublishAckPacket(),
        },
        {
            type: PacketTypes.TYPE_PUBREC,
            packet: () => new PublishReceivedPacket(),
        },
        {
            type: PacketTypes.TYPE_PUBREL,
            packet: () => new PublishReleasePacket(),
        },
        {
            type: PacketTypes.TYPE_PUBCOMP,
            packet: () => new PublishCompletePacket(),
        },
        {
            type: PacketTypes.TYPE_SUBSCRIBE,
            packet: () => new SubscribeRequestPacket(),
        },
        {
            type: PacketTypes.TYPE_SUBACK,
            packet: () => new SubscribeResponsePacket(),
        },
        {
            type: PacketTypes.TYPE_UNSUBSCRIBE,
            packet: () => new UnsubscribeRequestPacket(),
        },
        {
            type: PacketTypes.TYPE_UNSUBACK,
            packet: () => new UnsubscribeResponsePacket(),
        },
        {
            type: PacketTypes.TYPE_PINGREQ,
            packet: () => new PingRequestPacket(),
        },
        {
            type: PacketTypes.TYPE_PINGRESP,
            packet: () => new PingResponsePacket(),
        },
        {
            type: PacketTypes.TYPE_DISCONNECT,
            packet: () => new DisconnectRequestPacket(),
        },
    ];

    /**
     * Some workaround for async requests:
     * This prevents the execution if there's already something in the buffer.
     * Note: if something fails, this will lock forever
     * @type {{unlock: () => void; resolve: null; lock: () => void; locked: boolean}}
     */
    private lock = {
        locked: false,
        lock: () => {
            this.lock.locked = true;
        },
        unlock: () => {
            this.lock.locked = false;
            if(this.lock.resolve) {
                this.lock.resolve();
                this.lock.resolve = null;
            }
        },
        resolve: null,
    };

    public constructor(errorCallback?: (e: Error) => void) {
        this.stream = PacketStream.empty();
        this.errorCallback = errorCallback;
    }

    public async parse(data: Buffer): Promise<MqttPacket[]> {
        await this.waitForLock();
        this.lock.lock();
        console.log(data.toString('hex'));
        let startPos = this.stream.position;
        this.stream.write(data);
        console.log(startPos);
        this.stream.position = startPos;
        const results: MqttPacket[] = [];
        try {
            while (this.stream.remainingBytes > 0) {
                const type = this.stream.readByte() >> 4;

                let packet;
                try {
                    packet = this.mapping.find(x => x.type === type).packet();
                } catch (e) {
                    continue;
                }

                this.stream.seek(-1);
                let exitParser = false;
                await Bluebird.try(() => {
                    packet.read(this.stream);
                    results.push(packet);
                    this.stream.cut();
                    startPos = this.stream.position;
                })
                    .catch(EndOfStreamError, () => {
                        this.stream.position = startPos;
                        console.log(this.stream.position, this.stream.length);
                        exitParser = true;
                    })
                    .catch((e) => {
                        this.errorCallback(e);
                    });
                if (exitParser) break;
            }
        } catch(e) {
            this.errorCallback(e);
        }
        this.lock.unlock();
        return results;
    }

    private waitForLock(): Promise<void> {
        if(this.lock.locked) {
            return new Promise<void>(resolve => {
                this.lock.resolve = resolve;
            });
        } else {
            return Promise.resolve();
        }
    }
}
