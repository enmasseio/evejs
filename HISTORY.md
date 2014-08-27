# history


## not yet released, version 3.0.0

- Renamed the library to evejs.
- Implemented a `ServiceManager` and `TransportManager`.
- Implemented agent extension modules `request` and `pattern`.
- Implemented support for connecting to multiple transports at once.
- Implemented support for connecting with an alternative id.
- Implemented support for sending a message via a specific transport, by
  specifying either the transports type or id.
- Extended Agent with a functions `extend`, and `extentTo` for module loading. 
- Moved pattern listening functionality in a separate module.
- Renamed `Actor` to `Agent`, and `peer` to `agent`. 
- Renamed `*MessageBus` to `*Transport`. 
- Renamed `Agent.onMessage` to `Agent.receive`. 
- Moved the transports under the namespace `eve.transport.*`.


## 2014-08-01, version 2.1.0

- Added an example.


## 2014-08-01, version 2.0.0

- Changed to a Promise based API.
- Implemented DistribusMessageBus.
- Added examples on using `simple-actors` together with `babble`.
- Dropped support for sending additional data with messages.


## 2014-04-24, version 1.2.0

- Implemented AMQPMessageBus.


## 2014-02-17, version 1.1.0

- Renamed `Actor.receive` to `Actor.onMessage`.


## 2014-02-14, version 1.0.0

- Renamed `MessageBus.register` and `MessageBus.unregister` to
  `MessageBus.connect` and `MessageBus.disconnect`.


## 2014-02-14, version 0.0.1

- First implementation, comes with Actor, LocalMessageBus,
  and PubNubMessageBus.
