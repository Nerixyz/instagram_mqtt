import { Topic } from '../../topic';
import { compressDeflate } from '../../shared';
import { MQTToTClient } from '../../mqttot';

export class Commands {
    private client: MQTToTClient;

    public constructor(client) {
        this.client = client;
    }

    private async publishToTopic(topic: string, compressedData: string | Buffer, qos: 0 | 1) {
        this.client.publish({
            topic,
            payload: compressedData instanceof Buffer ? compressedData : Buffer.from(compressedData),
            qosLevel: qos,
        });
    }

    public async updateSubscriptions(options: { topic: Topic; data: { sub?: string[]; unsub?: string[] } | any }) {
        this.publishToTopic(options.topic.id, await compressDeflate(JSON.stringify(options.data)), 1);
    }
}
