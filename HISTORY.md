# history


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
