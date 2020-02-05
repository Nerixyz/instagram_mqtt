# Changelog

## 0.2.1
 - Removed initial raw mqtt subscriptions (disconnect)
 - Added proper keepAlive handling
 - Added FBNS and Realtime keepAlive

## 0.2.0
 - **BREAKING:** FBNS is no longer a EventEmitter, instead it uses RXJS Subjects.
    
    See [push.example](examples/push.example.ts) for more details.
 
 - **Internal:** More strict tsconfig.json

## 0.1.7
 - Move to `bigint`
 
    Although this
     [requires Node >= 10.4.0 and isn't supported by JavaScriptCore](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#Browser_compatibility),
    this does also add support for non-node environments without support for native code.
    (And thus it removes native compilation)
    
## 0.1.6
 - Added `FbnsDeviceAuth` support for a non-initialized `IgApiClient`

## 0.1.5
 - Added Extender
 
   The extender automatically adds either `FbnsClient` (`fbns`) or
   `RealtimeClient` (`realtime`) to the given `IgApiClient`.
   This can be done by using `withRealtime(IgApiClient)` or `withFbns(IgApiClient)`.
   For TypeScript users:
   The returned client is of the type `IgApiClientFbns`, `IgApiClientRealtime`
   or `IgApiClientMQTT` (both combined)
 - Fixed error in `MqttClient#finishFlow(undefined)`
