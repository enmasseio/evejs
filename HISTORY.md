# history

## not yet released, version 0.4.7

- Upgraded all dependencies.


## 2014-10-24, version 0.4.6

- Made sure all tests work again.

## 2014-10-24, version 0.4.5

- Fixed LocalConnection throwing an error instead of invoking Promise.reject
  when agent not found. Thanks @ianmuninio.
- Allowed HTTPS to use the HTTP protocol.
- Increased HTTP request max size to 30MB.
- Updated to new ws version 0.7.1.


## 2014-10-24, version 0.4.4

- Implemented `Agent.registerModule`.
- Better modular structure, support for custom builds.
- All `.send` methods now return a Promise.


## 2014-09-26, version 0.4.3

- Implemented auto-reconnect for WebSockets.
- Fixed the `babble` module always sending messages via it's own internal
  messagebus instead of the agents send/receive function.
- WebSocketTransport accepts any id.
- Improved error handling for sending messages.


## 2014-09-23, version 0.4.2

- Implemented a WebSocket transport.
- Added support for `hypertimer`, for discrete event simulations.
- Added support for a configurable `random` function, for deterministic random 
  values.
- Docs reorganized.


## 2014-09-12, version 0.4.1

- Fixed RPC module not accepting result values `undefined`.
- Fixed RPC response not having an id equal to the id of the request.


## 2014-09-12, version 0.4.0

- Completely reworked version of evejs, a mix of the former evejs and the 
  simple-actors module.
- Implemented a `ServiceManager` and `TransportManager`.
- Agents are extensible via functions `extend`, and `loadModule`. 
- Implemented agent extension modules `request`, `rpc`, `pattern`, and `babble`.
- Implemented transports for `http`, `distribus`, `pubnub`, `amqp`, and `local`
  messaging.
