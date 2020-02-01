import { Topic } from '../../topic';
import { compressDeflate } from '../../shared';
import { MQTToTClient } from '../../mqttot';
import { MqttMessage } from '../../mqtt';

export class Commands {
    public constructor(private client: MQTToTClient) {}

    private async publishToTopic(topic: string, compressedData: string | Buffer, qos: 0 | 1): Promise<MqttMessage> {
        return this.client.publish({
            topic,
            payload: compressedData instanceof Buffer ? compressedData : Buffer.from(compressedData),
            qosLevel: qos,
        });
    }

    public async updateSubscriptions(options: {
        topic: Topic;
        data: { sub?: string[]; unsub?: string[] } | any;
    }): Promise<MqttMessage> {
        return this.publishToTopic(options.topic.id, await compressDeflate(JSON.stringify(options.data)), 1);
    }
}
