import {IgApiClient} from "instagram-private-api";
import {Topics} from "./constants";
import {fbnsRead} from "./fbns-reader";
import {Commands} from "./commands/commands";
import {GraphQLSubscription} from "./subscriptions/graphql.subscription";

const mqtt = require('mqtt');
const zlib = require('zlib');
const {random} = require('lodash');

const ig = new IgApiClient();
ig.state.generateDevice(process.env.IG_USERNAME);

(async () => {

    const loggedUser = await ig.account.login(process.env.IG_USERNAME, process.env.IG_PASSWORD);

    const sessionId = ig.state.extractCookieValue('sessionid');

    const TopicsArray = Object.values(Topics);

    const deviceParams = ig.state.deviceString.split('; ');

    const mqttParams = {
        password: `sessionid=${sessionId}`,
        username: JSON.stringify({
            'dc': 'PRN',
            // userId
            'u': loggedUser.pk,
            // agent
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
            // capabilities
            'cp': 439,
            // client sessionId
            'mqtt_sid': random(100000000, 999999999),
            // networkType
            'nwt': 1,
            // networkSubtype
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
            'st': ['/pubsub', '/t_region_hint', '/ig_send_message_response'],
            'clientStack': 3,
            'app_specific_info': {
                'platform': 'android',
                'app_version': ig.state.appVersion,
                'capabilities': JSON.stringify(ig.state.supportedCapabilities),
                'everclear_subscriptions': '{\'presence_subscribe\':\'17846944882223835\'}',
                'User-Agent': ig.state.appUserAgent,
                'ig_mqtt_route': 'django',
                'Accept-Language': 'en-US',
                'pubsub_msg_type_blacklist': 'typing_type',
            },
        }),
        clientId: ig.state.phoneId.substr(0, 20)
    };

    const client = mqtt.connect('mqtts://edge-mqtt.facebook.com:443', {
        keepalive: 900,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        resubscribe: false,
        slashes: false,
        clean: true,
        rejectUnauthorized: false,
        ...mqttParams,
    });
    const commands = new Commands(client);

    client.on('connect', () => {
        console.log('Connected!');

        client.subscribe(TopicsArray.map(topic => topic.path), async (err) => {
            if (!err) {
                console.log('Subscribed!');
                await commands.updateSubscriptions({
                    topic: Topics.REALTIME_SUB, data: {
                        sub: [
                            GraphQLSubscription.getAppPresenceSubscription(),
                            GraphQLSubscription.getClientConfigUpdateSubscription(),
                            GraphQLSubscription.getZeroProvisionSubscription(ig.state.deviceId),
                            GraphQLSubscription.getDirectTypingSubscription(ig.state.cookieUserId),
                            GraphQLSubscription.getAsyncAdSubscription(ig.state.cookieUserId),
                        ]
                    }
                });
            } else {
                console.log('Subscribe error:', err);
            }
        });
    });

    client.on('close', () => {
        console.log('Closed!');
    });

    client.on('error', (err) => {
        console.log('ERR', err);
    });

    client.on('message', (msg) => {
        console.log(`MSG type: ${typeof msg}, msg: ${msg}`);
    });

    client.on('packetsend', (packet) => {
        console.log('PS', packet);
    });

    client.on('packetreceive', (packet) => {
        if (packet.cmd === 'suback' || packet.cmd === 'puback') {
            console.log('PR', packet.cmd);
            return true;
        }
        if (packet.payload === null) {
            console.log('PR no payload: ', packet);
            return true;
        }

        zlib.unzip(packet.payload, (err, result) => {
            if (!err) {
                const topic = TopicsArray.find(t => t.id === packet.topic);
                if (topic) {
                    if (topic.parser) {
                        console.log(`PR ${topic.path}`, topic.parser.parseMessage(topic, result))
                    } else {
                        console.log('PR - no parser; fbnsRead:', fbnsRead(result));
                    }
                } else {
                    console.log('PR', packet, '\nMSG: ' + result.toString());
                }
            } else {
                console.log(err);
            }
        });
    });
})();
