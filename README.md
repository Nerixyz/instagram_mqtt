# Instagram Realtime and FBNS

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/nerixyz/instagram_mqtt/Node%20CI?style=flat)](https://github.com/Nerixyz/instagram_mqtt/actions)

Thanks to [valga](https://github.com/valga) for providing and maintaining the [PHP library](https://github.com/valga/fbns-react).
This library integrates with the [instagram-private-api](https://github.com/dilame/instagram-private-api).

# Getting started

1. Run

```
npm install instagram_mqtt
```

2. Import the library `import { FbnsClient, RealtimeClient } from 'instagram_mqtt';`
   (with require: `const {FbnsClient, RealtimeClient} = require('instagram_mqtt')`)
   _Note: It's not recommended to use the clients directly. For further information look at the [examples](examples)._
3. Login to Instagram
4. [Use](examples) the clients.

## Version Infos

To see what's new, visit the [changelog](CHANGELOG.md).

### 0.2.0

If you're updating to 0.2.0, look at the [changelog](CHANGELOG.md) for breaking changes!

### below 0.1.5 (old)

Up to version 0.1.5 the clients worked on their own.
To init them they are constructed with a reference to the IgApiClient:

```typescript
import { FbnsClient, RealtimeClient } from 'instagram_mqtt';
import { IgApiClient } from 'instagram-private-api';

const ig = new IgApiClient();
// Initialize the client
// This includes logging in (if you are below 0.1.6)
// ig.account.login ...
const fbns = new FbnsClient(ig);
await fbns.connect();

const realtime = new RealtimeClient(ig);
await realtime.connect();
```

### 0.1.5 or above (new)

The new way of using mqtt is done by "extending" the base client.
_Note: this might change in a future version of the API_

```typescript
import {
    withRealtime,
    withFbns,
    // only for typescript
    IgApiClientMQTT,
} from 'instagram_mqtt';
import { IgApiClient } from 'instagram-private-api';

// using FBNS
const ig = withFbns(new IgApiClient());
await ig.fbns.connect();

// using realtime
const ig = withRealtime(new IgApiClient());
await ig.realtime.connect({
    /* initial subscriptions */
});

// using both
const ig = withFbns(withRealtime(new IgApiClient()));

// using typescript you can declare ig like this:
const ig: IgApiClientMQTT = withFbns(withRealtime(new IgApiClient()));
// this way, your IDE will provide proper highlighting
```

## TODO

-   Proper descriptions for events
-   Error handling
-   Testing... a lot.

# RealtimeClient

The RealtimeClient is used, as the name implies, for in-app communication.
Everything using some kind of event is communicating over this client.

#### Features

-   Typing Events
-   Presence Events
-   Direct Messaging

# FbnsClient

FBNS is for notifications (so it's readonly).
You can subscribe to a notification using

```typescript
// const fbns: FbnsClient = ...;
fbns.push$.subscripbe(notification => ...);
```

Note: this library provides the query (actionPath/Params) as an object (actionParams)
so you can use `actionParams.YOUR_KEY`.

# Debugging

In order to debug the clients you can set the environment variable `DEBUG`.
Recommended is setting it to `ig:mqtt:*`. If you want to debug the entire **instagram-private-api**, set it to `ig:*`.
Currently, the emitted "channels" are:

-   `ig:mqtt:realtime`
-   `ig:mqtt:fbns`
-   `ig:mqtt:mqttot`

An example `.env` file would look like this:

```
DEBUG=ig:mqtt:*
```

_Note:_ In version 0.1.14 the debug library was changed to **debug** instead of the native **util.debuglog**.
Thus the naming scheme is different `ig-mqtt-fbns` is now `ig:mqtt:fbns`
and instead of `NODE_DEBUG` the environment variable `DEBUG` is used.

### Raw TLS Sockets

To debug raw TLS Sockets you just have to set `enableTrace` to `true` while connecting:
`ig.realtime.connect({enableTrace: true})` or `ig.fbns.connect({enableTrace: true})`

# Research

All scripts to research the mqtt client are in the [`/frida/`](frida) directory.
As the name suggests, you'll need [frida](https://frida.re/) for this.

Start frida and connect to the process:

```
# assume frida is running on remote device...

frida -U -n com.instagram.android -l PATH_TO_SCRIPT

# com.instagram.threadsapp is also valid
```

| Script                               | Description                                |
| :----------------------------------- | ------------------------------------------ |
| [mqttListen.js](frida/mqttListen.js) | Prints all outgoing Realtime-MQTT messages |

# Architecture

## MQTToT

MQTToT is the underlying connection. It uses a modified version of MQTT 3.
The modifications are small, but (at least for javascript) may not work with regular MQTT libraries
(or at least without core modification).

#### Changes

-   **The connect packet** doesn't contain a `clientId`. Instead,
    it contains a zipped [thrift](https://people.apache.org/~thejas/thrift-0.9/javadoc/org/apache/thrift/protocol/TCompactProtocol.html)-payload.
    The flags are set to contain a username and password which are in the payload and not as strings in the packet.
-   **The connack packet** can contain a payload. Regular clients would throw an error
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
