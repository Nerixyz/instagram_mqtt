import {FbnsDeviceAuth} from "./fbns.device-auth";
import {FBNS, FbnsTopics} from "../constants";
import {BufferWriter, ThriftTypes} from "../thrift/thrift";

export class FbnsConnection {
    static readonly CLIENT_ID = 1;
    static readonly CLIENT_INFO = 4;
    static readonly PASSWORD = 5;
    static readonly USER_ID = 1;
    static readonly USER_AGENT = 2;
    static readonly CLIENT_CAPABILITIES = 3;
    static readonly ENDPOINT_CAPABILITIES = 4;
    static readonly PUBLISH_FORMAT = 5;
    static readonly NO_AUTOMATIC_FOREGROUND = 6;
    static readonly MAKE_USER_AVAILABLE_IN_FOREGROUND = 7;
    static readonly DEVICE_ID = 8;
    static readonly IS_INITIALLY_FOREGROUND = 9;
    static readonly NETWORK_TYPE = 10;
    static readonly NETWORK_SUBTYPE = 11;
    static readonly CLIENT_MQTT_SESSION_ID = 12;
    static readonly SUBSCRIBE_TOPICS = 14;
    static readonly CLIENT_TYPE = 15;
    static readonly APP_ID = 16;
    static readonly DEVICE_SECRET = 20;
    static readonly CLIENT_STACK = 21;

    public auth: FbnsDeviceAuth;
    public userAgent: string;
    public clientCapabilities: number;
    public endpointCapabilities: number;
    public publishFormat: number;
    public noAutomaticForeground: boolean;
    public makeUserAvailableInForeground: boolean;
    public isInitiallyForeground: boolean;
    public networkType: number;
    public networkSubtype: number;
    public clientMqttSessionId: number;
    public subscribeTopics: number[];
    public appId: number;
    public clientStack: number;

    constructor(auth: FbnsDeviceAuth, userAgent: string) {
        this.auth = auth;
        this.userAgent = userAgent;

        this.clientCapabilities = FBNS.CLIENT_CAPABILITIES;
        this.endpointCapabilities = FBNS.ENDPOINT_CAPABILITIES;
        this.publishFormat = FBNS.PUBLISH_FORMAT;
        this.noAutomaticForeground = true;
        this.makeUserAvailableInForeground = false;
        this.isInitiallyForeground = false;
        this.networkType = 1;
        this.networkSubtype = 0;

        this.subscribeTopics = [parseInt(FbnsTopics.FBNS_MESSAGE.id), parseInt(FbnsTopics.FBNS_REG_RESP.id)];
        this.appId = parseInt(FBNS.APP_ID);
        this.clientStack = FBNS.CLIENT_STACK;
    }

    public toThrift(): Buffer {
        return new BufferWriter(Buffer.alloc(2048))
            .writeString(FbnsConnection.CLIENT_ID, this.auth.clientId)
            .writeStruct(FbnsConnection.CLIENT_INFO)
            .writeInt64(FbnsConnection.USER_ID, this.auth.userId)
            .writeString(FbnsConnection.USER_AGENT, this.userAgent)
            .writeInt64(FbnsConnection.CLIENT_CAPABILITIES, this.clientCapabilities)
            .writeInt64(FbnsConnection.ENDPOINT_CAPABILITIES, this.endpointCapabilities)
            .writeInt32(FbnsConnection.PUBLISH_FORMAT, this.publishFormat)
            .writeBoolean(FbnsConnection.NO_AUTOMATIC_FOREGROUND, this.noAutomaticForeground)
            .writeBoolean(FbnsConnection.MAKE_USER_AVAILABLE_IN_FOREGROUND, this.makeUserAvailableInForeground)
            .writeString(FbnsConnection.DEVICE_ID, this.auth.deviceId)
            .writeBoolean(FbnsConnection.IS_INITIALLY_FOREGROUND, this.isInitiallyForeground)
            .writeInt32(FbnsConnection.NETWORK_TYPE, this.networkType)
            .writeInt32(FbnsConnection.NETWORK_SUBTYPE, this.networkSubtype)
            .writeInt64(FbnsConnection.CLIENT_MQTT_SESSION_ID, this.clientMqttSessionId || Date.now())
            .writeList(FbnsConnection.SUBSCRIBE_TOPICS, ThriftTypes.INT_32, this.subscribeTopics)
            .writeString(FbnsConnection.CLIENT_TYPE, 'device_auth')
            .writeInt64(FbnsConnection.APP_ID, this.appId)
            .writeString(FbnsConnection.DEVICE_SECRET, this.auth.deviceSecret)
            .writeInt8(FbnsConnection.CLIENT_STACK, this.clientStack)
            .writeStop()
            .writeString(FbnsConnection.PASSWORD, this.auth.password)
            .writeStop().buffer;
    }

    public toString(): string {
        return this.toThrift().toString();
    }

}
