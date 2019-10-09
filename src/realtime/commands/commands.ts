import Bluebird = require("bluebird");
import {Topic} from "../../topic";
import {compressDeflate} from "../../shared";
import {MqttClient} from "../../fbns/mqtt/mqtt.client";

const zlib = require('zlib');

export class Commands {
    private client: MqttClient;

    constructor(client) {
        this.client = client;
    }

    private async publishToTopic(topic: string, compressedData: string | Buffer, qos: 0|1) {
        this.client.publish({
            topic,
            payload: compressedData instanceof Buffer ? compressedData : Buffer.from(compressedData),
            qosLevel: qos,
        });
    }

    public async updateSubscriptions(options: { topic: Topic, data: {sub?: string[], unsub?: string[] }}) {
        this.publishToTopic(options.topic.id, await compressDeflate(JSON.stringify(options.data)), 1);
    }

    public async fbnsMessage() {

    }
}
