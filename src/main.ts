/* eslint no-console: "off" */
import { IgApiClient } from 'instagram-private-api';
import { FbnsClient } from './fbns/fbns.client';

const ig = new IgApiClient();

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
        console.log(`${topic.path}\n${JSON.stringify(messages.map(msg => msg.data),
        undefined, 2)}\n`);
    });
    realtimeClient.on('direct', logJSONEvent('direct'));
    realtimeClient.on('realtimeSub', logJSONEvent('realtimeSub'));
    realtimeClient.on('error', console.error);
    realtimeClient.on('close', () => console.error('RealtimeClient closed'));*/

    /* const mqttotRealtime = new MQTToTRealtimeClient(ig);
   await mqttotRealtime.connect();
    mqttotRealtime.on('message', logJSONEvent('message'));
    setInterval(() => console.log('f'), 10 * 60 * 1000);*/

    const fbnsClient = new FbnsClient(ig);
    fbnsClient.on('push', logEvent('push'));
    fbnsClient.on('auth', logEvent('auth'));
    fbnsClient.on('error', logRawEvent('error'));
    fbnsClient.on('warning', logRawEvent('warning'));
    await fbnsClient.connect();
})();

function logEvent(name: string): (data) => void {
    return (data: any) => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}

function logRawEvent(name: string): (data) => void {
    return data => console.log(name, data);
}
