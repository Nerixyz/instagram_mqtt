import {thriftReadToObject, thriftWriteFromObject} from "./thrift";
import { unzipAsync } from "./shared";
import {IgApiClient} from "instagram-private-api";
import {MQTToTConnection} from "./mqttot/mqttot.connection";
import {MqttParser} from "./mqtt/mqtt.parser";

/**
 *  This file is for analyzing requests.
 *  Put your zipped hex content (starting with 123 or 0x78) in 'data' and see the thrift struct.
 */

(async () => {
    const data = '';
    const buf = Buffer.from(data, 'hex');
    // @ts-ignore
    const unzipped = await unzipAsync(buf);
    console.log(unzipped.toString('hex'));

    const a = thriftReadToObject<any>(unzipped, MQTToTConnection.thriftConfig);
    console.log(a);

    const serialized = thriftWriteFromObject({clientIdentifier: a.clientIdentifier, clientInfo: a.clientInfo, password: a.password}, MQTToTConnection.thriftConfig);
    console.log(serialized.toString('hex').toUpperCase());
    console.log(areEqual(unzipped, serialized));
    logJSONEvent('reread')({a: thriftReadToObject(serialized, MQTToTConnection.thriftConfig)});
})();

function areEqual(a: Buffer, b: Buffer) {
    return a && b && a.length === b.length && a.toString() === b.toString();
}

function logJSONEvent(name: string): (data: any) => void {
    return (data: any) => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}
