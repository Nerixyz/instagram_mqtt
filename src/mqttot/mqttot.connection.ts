import { Int64, ThriftDescriptors, ThriftPacketDescriptor, thriftWriteFromObject } from '../thrift';

export type MQTToTConnectionData = Partial<{
    clientIdentifier: string;
    willTopic: string;
    willMessage: string;
    clientInfo: MQTToTConnectionClientInfo;
    password: string;
    unknown: number;
    appSpecificInfo: MQTToTConnectionAppSpecificInfo;
}>;
export type MQTToTConnectionAppSpecificInfo = Partial<{
    app_version: string;
    'X-IG-Capabilities': string;
    everclear_subscriptions: string;
    'User-Agent': string;
    'Accept-Language': string;
    platform: string;
    ig_mqtt_route: string;
    pubsub_msg_type_blacklist: string;
    auth_cache_enabled: string;
}>;
export type MQTToTConnectionClientInfo = Partial<{
    // TODO: remove object as polyfill
    userId: Int64;
    userAgent: string;
    clientCapabilities: Int64;
    endpointCapabilities: Int64;
    publishFormat: number;
    noAutomaticForeground: boolean;
    makeUserAvailableInForeground: boolean;
    deviceId: string;
    isInitiallyForeground: boolean;
    networkType: number;
    networkSubtype: number;
    clientMqttSessionId: Int64;
    clientIpAddress: string;
    subscribeTopics: number[];
    clientType: string;
    appId: Int64;
    overrideNectarLogging: boolean;
    connectTokenHash: string;
    regionPreference: string;
    deviceSecret: string;
    clientStack: number;
    fbnsConnectionKey: number;
    fbnsConnectionSecret: string;
    fbnsDeviceId: string;
    fbnsDeviceSecret: string;
    anotherUnknown: Int64;
}>;

export class MQTToTConnection {
    public fbnsConnectionData: MQTToTConnectionData;

    public static thriftConfig: ThriftPacketDescriptor[] = [
        ThriftDescriptors.binary('clientIdentifier', 1),
        ThriftDescriptors.binary('willTopic', 2),
        ThriftDescriptors.binary('willMessage', 3),
        ThriftDescriptors.struct('clientInfo', 4, [
            ThriftDescriptors.int64('userId', 1),
            ThriftDescriptors.binary('userAgent', 2),
            ThriftDescriptors.int64('clientCapabilities', 3),
            ThriftDescriptors.int64('endpointCapabilities', 4),
            ThriftDescriptors.int32('publishFormat', 5),
            ThriftDescriptors.boolean('noAutomaticForeground', 6),
            ThriftDescriptors.boolean('makeUserAvailableInForeground', 7),
            ThriftDescriptors.binary('deviceId', 8),
            ThriftDescriptors.boolean('isInitiallyForeground', 9),
            ThriftDescriptors.int32('networkType', 10),
            ThriftDescriptors.int32('networkSubtype', 11),
            ThriftDescriptors.int64('clientMqttSessionId', 12),
            ThriftDescriptors.binary('clientIpAddress', 13),
            ThriftDescriptors.listOfInt32('subscribeTopics', 14),
            ThriftDescriptors.binary('clientType', 15),
            ThriftDescriptors.int64('appId', 16),
            ThriftDescriptors.boolean('overrideNectarLogging', 17),
            ThriftDescriptors.binary('connectTokenHash', 18),
            ThriftDescriptors.binary('regionPreference', 19),
            ThriftDescriptors.binary('deviceSecret', 20),
            ThriftDescriptors.byte('clientStack', 21),
            ThriftDescriptors.int64('fbnsConnectionKey', 22),
            ThriftDescriptors.binary('fbnsConnectionSecret', 23),
            ThriftDescriptors.binary('fbnsDeviceId', 24),
            ThriftDescriptors.binary('fbnsDeviceSecret', 25),
            ThriftDescriptors.int64('anotherUnknown', 26),
        ]),
        ThriftDescriptors.binary('password', 5),
        // polyfill
        ThriftDescriptors.int16('unknown', 5),
        ThriftDescriptors.listOfBinary('getDiffsRequests', 6),
        ThriftDescriptors.binary('zeroRatingTokenHash', 9),
        ThriftDescriptors.mapBinaryBinary('appSpecificInfo', 10),
    ];

    public constructor(connectionData: MQTToTConnectionData) {
        this.fbnsConnectionData = connectionData;
    }

    public toThrift(): Buffer {
        return thriftWriteFromObject(this.fbnsConnectionData, MQTToTConnection.thriftConfig);
    }

    public toString(): string {
        return this.toThrift().toString();
    }
}
