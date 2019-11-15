# Instagram Realtime and FBNS
This library is heavily based on the [PHP implementation](https://github.com/valga/fbns-react).
It integrates with the [instagram-private-api](https://github.com/dilame/instagram-private-api).

# Getting started

1. Run ```npm install Nerixyz/instagram_mqtt```
2. Import the library `import { FbnsClient, RealtimeClient } from 'instagram_mqtt';`
 (with require: `const {FbnsClient, RealtimeClient} = require('instagram_mqtt')`)
3. Login to Instagram
4. [Use](examples) the clients.

## TODO
 - Proper descriptions for events
 - Error handling
 - Testing... a lot.

# RealtimeClient
The RealtimeClient is used, as the name implies, for in-app communication.
Everything using some kind of event is communicating over this client.
#### Features
 - Typing Events
 - Presence Events
 - Direct Messaging
# FbnsClient
FBNS is for notifications (so it's readonly).
You can subscribe to a notification type using
```typescript
// const fbns: FbnsClient = ...;
fbns.on(TYPE, notification => ...);
```
The events are described [here](src/fbns/fbns.client.ts).
And [here](https://github.com/mgp25/Instagram-API/blob/master/src/Push.php).
Note: this library provides the query (actionPath/Params) as an object (actionParams)
 so you can use `actionParams.YOUR_KEY`.

# Architecture

## MQTToT
MQTToT is the underlying connection. It uses a modified version of MQTT 3.
The modifications are small, but (at least for javascript) may not work with regular MQTT libraries
(or at least without core modification).
#### Changes
 - **The connect packet** doesn't contain a `clientId`. Instead,
  it contains a zipped [thrift](https://people.apache.org/~thejas/thrift-0.9/javadoc/org/apache/thrift/protocol/TCompactProtocol.html)-payload.
  The flags are set to contain a username and password which are in the payload and not as strings in the packet.
 - **The connack packet** can contain a payload. Regular clients would throw an error
  as the remaining length should be equal to 0 but in this case it's intended (the MQTT 3 standard doesn't specify a payload).

## RealtimeClient
In earlier versions, the realtime client used an old method (built on the MQTT standard) to connect
(it's still being used in mgp25's library), but thr RealtimeClient is using MQTToT to connect.
In contrast to FBNS it doesn't use a device-auth, it uses cookie-auth as it was the case with the
old method.

The RealtimeClient communicates on different MQTT-Topics 8most of the time one for requesting and one for a response).

## FbnsClient
FBNS uses MQTToT to connect with a device-auth.
A successful auth will return a payload in the CONNACK packet with values used for future connections.
And a response containing a token,
that gets sent to an instagram api endpoint (`/api/v1/push/register/`), is sent to `/fbns_reg_resp`.
This completes the auth.

Now, push notifications are sent to `/fbns_msg`.

# Collaborating

## Setting up the environment
If you're using x86, make sure to install ARM translations for yor device
 in order to get ProxyDroid to work.
 
 Instructions are [here](https://github.com/dilame/instagram-private-api/blob/master/CONTRIBUTING.md#capturing-tls-requests).

