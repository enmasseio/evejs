# history


## not yet released, version 0.4.3

- Implemented auto-reconnect for WebSockets.
- Fixed the `babble` module always sending messages via it's own internal
  messagebus instead of the agents send/receive function.
- WebSocketTransport accepts any id.
- Improved error handling for sending messages.


## 2014-10-23, version 0.4.2

- Implemented a WebSocket transport.
- Added support for `hypertimer`, for discrete event simulations.
- Added support for a configurable `random` function, for deterministic random 
  values.
- Docs reorganized.


## 2014-10-12, version 0.4.1

- Fixed RPC module not accepting result values `undefined`.
- Fixed RPC response not having an id equal to the id of the request.


## 2014-10-12, version 0.4.0

- Completely reworked version of evejs, a mix of the former evejs and the 
  simple-actors module.
- Implemented a `ServiceManager` and `TransportManager`.
- Agents are extensible via functions `extend`, and `loadModule`. 
- Implemented agent extension modules `request`, `rpc`, `pattern`, and `babble`.
- Implemented transports for `http`, `distribus`, `pubnub`, `amqp`, and `local`
  messaging.
