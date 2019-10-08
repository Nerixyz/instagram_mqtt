import {IgApiClient} from "instagram-private-api";
import {GraphQLSubscription} from "./realtime/subscriptions/graphql.subscription";
import {RealtimeClient} from "./realtime/realtime.client";
import {Topic} from "./topic";
import {ParsedMessage} from "./realtime/parsers/parser";
import {FbnsClient} from "./fbns/fbns.client";
const mqtt = require('mqtt');
const zlib = require('zlib');
const {random} = require('lodash');

const ig = new IgApiClient();
ig.state.generateDevice(process.env.IG_USERNAME);

(async () => {

    await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

   const realtimeClient = new RealtimeClient(ig, [
        GraphQLSubscription.getAppPresenceSubscription(),
        GraphQLSubscription.getClientConfigUpdateSubscription(),
        GraphQLSubscription.getZeroProvisionSubscription(ig.state.deviceId),
        GraphQLSubscription.getDirectTypingSubscription(ig.state.cookieUserId),
        GraphQLSubscription.getAsyncAdSubscription(ig.state.cookieUserId),
    ]);
    realtimeClient.on('receive', (topic: Topic, messages: ParsedMessage[]) => {
        console.log(`${topic.path}\n${JSON.stringify(messages.map(msg => msg.data), undefined, 4)}\n`);
    });
    realtimeClient.on('error', console.error);
    realtimeClient.on('close', () => console.error('RealtimeClient closed'));

})();

/*(async () => {
    // your ig lib init here

    const loggedUser = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const cookieJar = await ig.state.serializeCookieJar();

    let sessionId;
    for (let cookie of cookieJar.cookies) {
        if (cookie.key === 'sessionid')
            sessionId = cookie.value;
    }

    const deviceParams = ig.state.deviceString.split('; ');

    const mqttParams = {
        password: `sessionid=${sessionId}`,
        username: JSON.stringify({
            'dc': 'PRN',
            'u': loggedUser.pk,
            'a':
                `[FBAN/InstagramForAndroid;`
                + `FBAV/${ig.state.appVersion};`
                + `FBBV/84433655;`
                + `FBDM/{density=4.0,width=${deviceParams[2].split('x')[0]},height=${deviceParams[2].split('x')[1]};`
                + `FBLC/${ig.state.language};`
                + `FBCR/;`
                + `FBMF/${deviceParams[3].toUpperCase()};`
                + `FBBD/${deviceParams[3].toUpperCase()};`
                + `FBPN/com.instagram.android;`
                + `FBDV/${deviceParams[4].toUpperCase()};`
                + `FBSV/7.0;`
                + `FBBK/1;`
                + `FBCA/armeabi-v7a:armeabi;]`,
            'cp': 439,
            'mqtt_sid': random(100000000, 999999999),
            'nwt': 1,
            'nwst': 0,
            'chat_on': false,
            'no_auto_fg': true,
            'd': ig.state.phoneId,
            'ds': '',
            'fg': false,
            'ecp': 0,
            'pf': 'jz',
            'ct': 'cookie_auth',
            'aid': ig.state.fbAnalyticsApplicationId,
            'st': ['/pubsub','/t_region_hint','/ig_send_message_response'],
            'clientStack': 3,
            'app_specific_info':{
                'platform':'android',
                'app_version': ig.state.appVersion,
                'capabilities': JSON.stringify(ig.state.supportedCapabilities),
                'everclear_subscriptions':'{\'presence_subscribe\':\'17846944882223835\'}',
                'User-Agent': ig.state.appUserAgent,
                'ig_mqtt_route': 'django',
                'Accept-Language': 'en-US'
            }}),
        clientId: ig.state.phoneId.substr(0,20)
    };

    const client = mqtt.connect('mqtt://127.0.0.1:1337', {
        keepalive: 900,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        resubscribe: false,
        slashes: false,
        clean: true,
        password: mqttParams.password,
        username: mqttParams.username,
        clientId: mqttParams.clientId,
        rejectUnauthorized: false
    });

    client.on('connect', function () {
        console.log('Connected!');

        client.subscribe([
            '/pubsub',
            '/ig_send_message',
            '/ig_send_message_response',
            '/ig_sub_iris',
            '/ig_sub_iris_response',
            '/ig_message_sync',
            '/ig_realtime_sub',
            '/t_region_hint'
        ], function (err) {
            if (!err) {
                console.log('Subscribed!');
            } else {
                console.log('Subscribe error:', err);
            }
        });
    });

    client.on('close', function () {
        console.log('Closed!');
    });

    client.on('error', function (err) {
        console.log('ERR', err);
    });

    client.on('message', function (msg) {
        console.log('MSG', msg);
    });

    client.on('packetsend', function(packet) {
        console.log('PS', packet);
    });

    client.on('packetreceive', function(packet) {
        if (packet.payload === null) {
            console.log('PR', packet);
            return true;
        }

        zlib.unzip(packet.payload, (err, buffer) => {
            if (!err) {
                console.log('PR', packet, '\nMSG: ' + buffer.toString());
            } else {
                console.log(err);
            }
        });
    });
})();*/
