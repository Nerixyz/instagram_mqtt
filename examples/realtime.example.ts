import { RealtimeClient } from '../src';
import { GraphQLSubscriptions } from '../src/realtime/subscriptions/graphql.subscription';
import { IgApiClient } from 'instagram-private-api';

(async () => {
    // normal login
    const ig = new IgApiClient();
    ig.state.generateDevice(process.env.IG_USERNAME);
    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const realtimeClient = new RealtimeClient(ig, [
        // these are some subscriptions
        GraphQLSubscriptions.getAppPresenceSubscription(),
        GraphQLSubscriptions.getClientConfigUpdateSubscription(),
        GraphQLSubscriptions.getZeroProvisionSubscription(ig.state.phoneId),
        GraphQLSubscriptions.getDirectStatusSubscription(),
        GraphQLSubscriptions.getDirectTypingSubscription(ig.state.cookieUserId),
        GraphQLSubscriptions.getAsyncAdSubscription(ig.state.cookieUserId),
    ]);

    const subToLiveComments = (broadcastId) =>
        // you can add other GraphQL subs using .subscribe
    realtimeClient.subscribe(GraphQLSubscriptions.getLiveRealtimeCommentsSubscription(broadcastId));

    // whenever something gets sent and has no event, this is called
    realtimeClient.on('receive', (topic, messages) => {
        console.log('receive', topic, messages);
    });
    realtimeClient.on('direct', logEvent('direct'));
    // whenever something gets sent to /ig_realtime_sub and has no event, this is called
    realtimeClient.on('realtimeSub', logEvent('realtimeSub'));
    // whenever the client has a fatal error
    realtimeClient.on('error', console.error);
    realtimeClient.on('close', () => console.error('RealtimeClient closed'));
    await realtimeClient.connect();
})();

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name) {
    return data => console.log(name, data);
}
