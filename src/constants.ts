import {RegionHintParser} from "./parsers/region-hint.parser";
import {GraphqlParser} from "./parsers/graphql.parser";
import {IrisParser} from "./parsers/iris.parser";
import {JsonParser} from "./parsers/json.parser";
import {SkywalkerParser} from "./parsers/skywalker.parser";

export const Topics = {
    GRAPHQL: {
        id: '9',
        path: '/graphql',
        parser: new GraphqlParser(),
    },
    PUBSUB: {
        id: '88',
        path: '/pubsub',
        parser: new SkywalkerParser(),
    },
    SEND_MESSAGE: {
        id: '132',
        path: '/ig_send_message',
        parser: undefined,
    },
    SEND_MESSAGE_RESPONSE: {
        id: '133',
        path: '/ig_send_message_response',
        parser: new JsonParser(),
    },
    IRIS_SUB: {
        id: '134',
        path: '/ig_sub_iris',
        parser: undefined,
    },
    IRIS_SUB_RESPONSE: {
        id: '135',
        path: '/ig_sub_iris_response',
        parser: new JsonParser(),
    },
    MESSAGE_SYNC: {
        id: '146',
        path: '/ig_message_sync',
        parser: new IrisParser(),
    },
    REALTIME_SUB: {
        id: '149',
        path: '/ig_realtime_sub',
        parser: new GraphqlParser(),
    },
    REGION_HINT: {
        id: '150',
        path: '/t_region_hint',
        parser: new RegionHintParser(),
    },
};
