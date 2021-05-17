import * as Chance from 'chance';

// src: com.instagram.realtimeclient.RealtimeSubscription
export const QueryIDs = {
    appPresence: '17846944882223835',
    asyncAdSub: '17911191835112000',
    clientConfigUpdate: '17849856529644700',
    directStatus: '17854499065530643',
    directTyping: '17867973967082385',
    liveWave: '17882305414154951',
    interactivityActivateQuestion: '18005526940184517',
    interactivityRealtimeQuestionSubmissionsStatus: '18027779584026952',
    interactivitySub: '17907616480241689',
    liveRealtimeComments: '17855344750227125',
    liveTypingIndicator: '17926314067024917',
    mediaFeedback: '17877917527113814',
    reactNativeOTA: '17861494672288167',
    videoCallCoWatchControl: '17878679623388956',
    videoCallInAlert: '17878679623388956',
    videoCallPrototypePublish: '18031704190010162',
    zeroProvision: '17913953740109069',
};

export interface GraphQLSubscription {
    subscriptionQueryId: string;
    inputParams: Record<string, any>;
}

export interface GraphQLSubBaseOptions {
    subscriptionId?: string;
    clientLogged?: boolean;
}

export class GraphQLSubscriptions {
    private static formatSubscriptionString(queryId: string, inputParams: any, clientLogged?: boolean): string {
        return `1/graphqlsubscriptions/${queryId}/${JSON.stringify({
            input_data: inputParams,
            ...(clientLogged ? { '%options': { client_logged: clientLogged } } : {}),
        })}`;
    }

    public static getAppPresenceSubscription = (options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.appPresence,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
            },
            options.clientLogged,
        );

    public static getAsyncAdSubscription = (userId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.asyncAdSub,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                user_id: userId,
            },
            options.clientLogged,
        );

    public static getClientConfigUpdateSubscription = (options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.clientConfigUpdate,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
            },
            options.clientLogged,
        );

    public static getDirectStatusSubscription = (options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.directStatus,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
            },
            options.clientLogged,
        );

    public static getDirectTypingSubscription = (userId: string, clientLogged?: boolean) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.directTyping,
            {
                user_id: userId,
            },
            clientLogged,
        );

    public static getIgLiveWaveSubscription = (
        broadcastId: string,
        receiverId: string,
        options: GraphQLSubBaseOptions = {},
    ) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.liveWave,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
                receiver_id: receiverId,
            },
            options.clientLogged,
        );

    public static getInteractivityActivateQuestionSubscription = (
        broadcastId: string,
        options: GraphQLSubBaseOptions = {},
    ) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.interactivityActivateQuestion,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
            },
            options.clientLogged,
        );

    public static getInteractivityRealtimeQuestionSubmissionsStatusSubscription = (
        broadcastId: string,
        options: GraphQLSubBaseOptions = {},
    ) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.interactivityRealtimeQuestionSubmissionsStatus,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
            },
            options.clientLogged,
        );

    public static getInteractivitySubscription = (broadcastId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.interactivitySub,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
            },
            options.clientLogged,
        );

    public static getLiveRealtimeCommentsSubscription = (broadcastId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.liveRealtimeComments,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
            },
            options.clientLogged,
        );

    public static getLiveTypingIndicatorSubscription = (broadcastId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.liveTypingIndicator,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                broadcast_id: broadcastId,
            },
            options.clientLogged,
        );

    public static getMediaFeedbackSubscription = (feedbackId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.mediaFeedback,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                feedback_id: feedbackId,
            },
            options.clientLogged,
        );

    public static getReactNativeOTAUpdateSubscription = (buildNumber: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.reactNativeOTA,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                build_number: buildNumber,
            },
            options.clientLogged,
        );

    public static getVideoCallCoWatchControlSubscription = (videoCallId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.videoCallCoWatchControl,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                video_call_id: videoCallId,
            },
            options.clientLogged,
        );

    public static getVideoCallInCallAlertSubscription = (videoCallId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.videoCallInAlert,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                video_call_id: videoCallId,
            },
            options.clientLogged,
        );

    public static getVideoCallPrototypePublishSubscription = (
        videoCallId: string,
        options: GraphQLSubBaseOptions = {},
    ) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.videoCallPrototypePublish,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                video_call_id: videoCallId,
            },
            options.clientLogged,
        );

    public static getZeroProvisionSubscription = (deviceId: string, options: GraphQLSubBaseOptions = {}) =>
        GraphQLSubscriptions.formatSubscriptionString(
            QueryIDs.zeroProvision,
            {
                client_subscription_id: options.subscriptionId || new Chance().guid({ version: 4 }),
                device_id: deviceId,
            },
            options.clientLogged,
        );
}
