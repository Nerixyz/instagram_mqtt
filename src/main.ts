import {IgApiClient} from "instagram-private-api";
import {promisify} from "util";
import {readFile} from "fs";
import {Connect} from "./fbns/thrift-types";
import {BinaryProtocol, BufferedTransport} from "@creditkarma/thrift-server-core";
import {unzipAsync} from "./shared";
import {
    ThriftDescriptors,
    ThriftPacketDescriptor,
    thriftRead,
    thriftReadToObject,
    ThriftTypes,
    thriftWriteFromObject
} from "./thrift";
import {FbnsClient} from "./fbns/fbns.client";
import {RealtimeClient} from "./realtime/realtime.client";
import {GraphQLSubscription} from "./realtime/subscriptions/graphql.subscription";
import {Topic} from "./topic";
import {ParsedMessage} from "./realtime/parsers/parser";
import {MQTToTRealtimeClient} from "./mqttot/mqttot.realtime-client";


const thriftrw = require('thriftrw');
const bufrw = require('bufrw');
const path = require('path');
const ig = new IgApiClient();

const readFileAsync = promisify(readFile);

ig.state.generateDevice(process.env.IG_USERNAME);

(async () => {

    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

   /*const realtimeClient = new RealtimeClient(ig, [
        GraphQLSubscription.getAppPresenceSubscription(),
        GraphQLSubscription.getClientConfigUpdateSubscription(),
        GraphQLSubscription.getZeroProvisionSubscription(ig.state.deviceId),
        GraphQLSubscription.getDirectTypingSubscription(ig.state.cookieUserId),
        GraphQLSubscription.getAsyncAdSubscription(ig.state.cookieUserId),
    ]);
    realtimeClient.on('receive', (topic: Topic, messages: ParsedMessage[]) => {
        console.log(`${topic.path}\n${JSON.stringify(messages.map(msg => msg.data), undefined, 2)}\n`);
    });
    realtimeClient.on('direct', logJSONEvent('direct'));
    realtimeClient.on('realtimeSub', logJSONEvent('realtimeSub'));
    realtimeClient.on('error', console.error);
    realtimeClient.on('close', () => console.error('RealtimeClient closed'));*/

   const mqttotRealtime = new MQTToTRealtimeClient(ig);
   await mqttotRealtime.connect();
    mqttotRealtime.on('message', logJSONEvent('message'));
    setInterval(() => console.log('f'), 10 * 60 * 1000);

    /*const fbnsClient = new FbnsClient(ig);
    await fbnsClient.connect();
    fbnsClient.on('message', logJSONEvent('message'));
    setInterval(() => console.log('f'), 10 * 60 * 1000);*/

    /*const data = '';

    const unzipped = await unzipAsync(Buffer.from(data, 'hex'));
    console.log(unzipped.toString('hex'));

    const a = thriftReadToObject<any>(unzipped, FbnsConnection.thriftConfig);
    console.log(a);

    const serialized = thriftWriteFromObject({clientIdentifier: a.clientIdentifier, clientInfo: a.clientInfo, password: a.password, appSpecificInfo: a.appSpecificInfo }, FbnsConnection.thriftConfig);
    console.log(serialized.toString('hex').toUpperCase());
    console.log(areEqual(unzipped, serialized));
    logJSONEvent('aaaa')({lol: thriftReadToObject(serialized, FbnsConnection.thriftConfig)});*/
})();

function areEqual(a: Buffer, b: Buffer) {
    return a && b && a.length === b.length && a.toString() === b.toString();
}

function logJSONEvent(name: string): (data: any) => void {
    return (data: any) => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}
