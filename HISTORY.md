# history


## not yet released, version 0.4.0

- Completely reworked version of evejs, a mix of the former evejs and the 
  simple-actors module.
- Implemented a `ServiceManager` and `TransportManager`.
- Agents are extensible via functions `extend`, and `loadModule`. 
- Implemented agent extension modules `request`, `rpc`, `pattern`, and `babble`.
- Implemented transports for `http`, `distribus`, `pubnub`, `amqp`, and `local`
  messaging.
