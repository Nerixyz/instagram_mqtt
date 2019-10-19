/* eslint no-console: "off" */
import { IgApiClient } from 'instagram-private-api';
import { FbnsClient } from './fbns/fbns.client';
import { RealtimeClient } from './realtime/realtime.client';
import { GraphQLSubscription, GraphQLSubscriptions } from './realtime/subscriptions/graphql.subscription';
import { Topic } from './topic';
import { ParsedMessage } from './realtime/parsers/parser';

const ig = new IgApiClient();

ig.state.generateDevice(process.env.IG_USERNAME);

(async () => {
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const realtimeClient = new RealtimeClient(ig, [
        GraphQLSubscriptions.getAppPresenceSubscription(),
        GraphQLSubscriptions.getClientConfigUpdateSubscription(),
        GraphQLSubscriptions.getZeroProvisionSubscription(ig.state.deviceId),
        GraphQLSubscriptions.getDirectTypingSubscription(ig.state.cookieUserId),
        GraphQLSubscriptions.getAsyncAdSubscription(ig.state.cookieUserId),
    ]);
    realtimeClient.on('receive', (topic: Topic, messages: ParsedMessage[]) => {
        console.log(`${topic.path}\n${JSON.stringify(messages.map(msg => msg.data), undefined, 2)}\n`);
    });
    realtimeClient.on('direct', logEvent('direct'));
    realtimeClient.on('realtimeSub', logEvent('realtimeSub'));
    realtimeClient.on('error', console.error);
    realtimeClient.on('close', () => console.error('RealtimeClient closed'));
    await realtimeClient.connect();

    /*const fbnsClient = new FbnsClient(ig);
    fbnsClient.on('push', logEvent('push'));
    fbnsClient.on('auth', logEvent('auth'));
    fbnsClient.on('error', logRawEvent('error'));
    fbnsClient.on('warning', logRawEvent('warning'));
    await fbnsClient.connect();*/
})();

function logEvent(name: string): (data) => void {
    return (data: any) => console.log(`${name}: ${JSON.stringify(data, undefined, 2)}`);
}

function logRawEvent(name: string): (data) => void {
    return data => console.log(name, data);
}
