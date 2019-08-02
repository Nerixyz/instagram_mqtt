import Chance = require('chance');

export class GraphQLSubscription {
    private static formatSubscriptionString(sub: IGraphqlSubscription): string {
        return `1/graphqlsubscriptions/${sub.subscriptionQueryId}/${JSON.stringify({input_data: sub.inputParams})}`
    }

    public static getAppPresenceSubscription() {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17846944882223835',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
            }
        })
    }

    public static getAsyncAdSubscription(userId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17911191835112000',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                user_id: userId,
            }
        })
    }

    public static getClientConfigUpdateSubscription() {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17969151037264401',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
            }
        })
    }

    public static getDirectTypingSubscription(userId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17867973967082385',
            inputParams: {
                user_id: userId,
            }
        })
    }

    public static getIgLiveWaveSubscription(broadcastId: string, receiverId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17882305414154951',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
                receiver_id: receiverId,
            }
        })
    }

    public static getInteractivityActivateQuestionSubscription(broadcastId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '18005526940184517',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
            }
        })
    }

    public static getInteractivityRealtimeQuestionSubmissionsStatusSubscription(broadcastId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '18027779584026952',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
            }
        })
    }

    public static getInteractivitySubscription(broadcastId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17907616480241689',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
            }
        })
    }

    public static getLiveRealtimeCommentsSubscription(broadcastId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17855344750227125',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
            }
        })
    }

    public static getLiveTypingIndicatorSubscription(broadcastId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17926314067024917',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                broadcast_id: broadcastId,
            }
        })
    }

    public static getMediaFeedbackSubscription(feedbackId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17877917527113814',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                feedback_id: feedbackId,
            }
        })
    }

    public static getReactNativeOTAUpdateSubscription(buildNumber: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17861494672288167',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                build_number: buildNumber,
            }
        })
    }

    public static getVideoCallCoWatchControlSubscription(videoCallId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '18058498174062927',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                video_call_id: videoCallId,
            }
        })
    }

    public static getVideoCallInCallAlertSubscription(videoCallId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '18025651213162780',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                video_call_id: videoCallId,
            }
        })
    }

    public static getZeroProvisionSubscription(deviceId: string) {
        return GraphQLSubscription.formatSubscriptionString({
            subscriptionQueryId: '17913953740109069',
            inputParams: {
                client_subscription_id: new Chance().guid({version: 4}),
                device_id: deviceId,
            }
        })
    }
}

export interface IGraphqlSubscription {
    subscriptionQueryId: string;
    inputParams: any;
}
