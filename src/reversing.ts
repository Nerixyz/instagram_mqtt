import {thriftReadToObject, thriftWriteFromObject} from "./thrift";
import { unzipAsync } from "./shared";
import {IgApiClient} from "instagram-private-api";
import {MQTToTConnection} from "./mqttot/mqttot.connection";

(async () => {
    const data = '78da9260f6f1716400000000ffff0300033b00f5';
    const unzipped = await unzipAsync(Buffer.from(data, 'hex'));
    console.log(unzipped.toString('hex'));

    const a = thriftReadToObject<any>(unzipped, MQTToTConnection.thriftConfig);
    console.log(a);

    const serialized = thriftWriteFromObject({clientIdentifier: a.clientIdentifier, clientInfo: a.clientInfo, password: a.password}, MQTToTConnection.thriftConfig);
    console.log(serialized.toString('hex').toUpperCase());
    console.log(areEqual(unzipped, serialized));
    logJSONEvent('aaaa')({lol: thriftReadToObject(serialized, MQTToTConnection.thriftConfig)});
})();

function areEqual(a: Buffer, b: Buffer) {
    return a && b && a.length === b.length && a.toString() === b.toString();
}

function logJSONEvent(name: string): (data: any) => void {
    return (data: any) => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}
