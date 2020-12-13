# Instagram Realtime and FBNS

[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/nerixyz/instagram_mqtt/Node%20CI?style=flat)](https://github.com/Nerixyz/instagram_mqtt/actions)

# Getting started

-   Install the library

```
npm i instagram_mqtt

OR 

yarn add instagram_mqtt
```

-   Extend the `IgApiClient`

```typescript
import { IgApiClient } from 'instagram-private-api';
import { withFbnsAndRealtime, withFbns, withRealtime } from 'instagram_mqtt';

// wrap the client
// ig is now IgApiClientMQTT for typescript users
const ig = withFbnsAndRealtime(new IgApiClient());

// OR if you only want fbns/realtime
const igFbns = withFbns(new IgApiClient());
const igRealtime = withRealtime(new IgApiClient());

// login like you usually do or load the state

// use ig.realtime and ig.fbns
```

-   [Look at the examples](examples)

## Version Infos

To see what's new, visit the [changelog](CHANGELOG.md).

# RealtimeClient

The RealtimeClient is used, as the name implies, for in-app communication.
Everything using some kind of event is communicating over this client.

#### Features

-   Typing Events
-   Presence Events
-   Direct Messaging
-   Live Comments
-   Live Events

## Events

Your IDE should be able to auto complete the event names for you as Typescript types are in the npm package.


| Name               | Description                                                       | Typed?    |
| ------------------ | ----------------------------------------------------------------- | --------- |
| realtimeSub        | Any message sent to `/ig_realtime_sub`                            | partially |
| direct             | Direct _events_                                                   | yes       |
| iris               | Any message sent to `/ig_message_sync` not handled by `message`   | partially |
| message            | Direct messages                                                   | yes       |
| clientConfigUpdate | Updates to quick experiments (may cause the client to disconnect) | yes       |
| appPresence        | Presence updates                                                  | yes       |
| \<keyof QueryIDs\>   | Messages regarding the specified query id                         | no        |

# FbnsClient

FBNS is for notifications (so it's readonly).
You can subscribe to any notification using

```typescript
ig.fbns.on('push' /* your handler */);
```

You can subscribe to a specific event using

```typescript
ig.fbns.on(/* desired collapseKey */, /* your handler */)
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

If you want to debug the `mqtts` library set it either to `*` or `ig:*,mqtts:*`.

An example `.env` file would look like this:

```
DEBUG=ig:mqtt:*
```

# Extending
## Mixins
Since version 1.0, there is support for basic mixins. 
A mixin is a class with an `apply()` method (extends [Mixin](src/realtime/mixins/mixin.ts) base class).
This method is called once the RealtimeClient is constructed. 
You can use the `hook()` function to hook into methods (pre and post) and override the return value.
By default, the [`MessageSyncMixin`](src/realtime/mixins/message-sync.mixin.ts) and the [`RealtimeSubMixin`](src/realtime/mixins/realtime-sub.mixin.ts) are used.

## TODO

-   Proper descriptions for events
-   Error handling
-   Testing... a lot.

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

# Thanks

Thanks to [valga](https://github.com/valga) for providing and maintaining the [PHP library](https://github.com/valga/fbns-react).
This library integrates with the [instagram-private-api](https://github.com/dilame/instagram-private-api).
