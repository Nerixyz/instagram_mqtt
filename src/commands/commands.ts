import {MqttClient, Packet} from "mqtt";
import Bluebird = require("bluebird");
import {Topic} from "../topic";

const zlib = require('zlib');

export class Commands {
    private client: MqttClient;

    constructor(client) {
        this.client = client;
    }

    private async compressDeflate(data) {
        return Bluebird.fromCallback<Buffer>(cb => zlib.deflate(data, {level: 9}, cb));
    }

    private async publishToTopicAsync(topic: string, compressedData: string | Buffer, qos: 0|1) {
        return Bluebird.fromCallback<Packet>(
            cb => this.client.publish(topic, compressedData,{qos}, cb));
    }

    public async updateSubscriptions(options: { topic: Topic, data: {sub?: string[], unsub?: string[] }}) {
        return this.publishToTopicAsync(options.topic.id, await this.compressDeflate(JSON.stringify(options.data)), 1);
    }

    public async fbnsMessage() {

    }
}
