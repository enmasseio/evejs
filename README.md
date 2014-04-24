# simple-actors

Simple message based actors

The actors send messages to each other via a message bus, and they can listen
for message patterns.


## Install

Install the module via npm:

    npm install simple-actors

*(Please let me know if you know a better name for this library...)*


## Use

Example usage:

```js
var actors = require('simple-actors');

var bus = new actors.LocalMessageBus();
    actor1 = new actors.Actor('actor1');
    actor2 = new actors.Actor('actor2');

actor1.connect(bus);
actor2.connect(bus);

// actor1 listens for messages containing 'hi' or 'hello' (case insensitive)
actor1.on(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// actor2 listens for any message
actor2.on(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to actor 1
actor2.send('actor1', 'Hello actor1!');
```


## API

The library contains the following prototypes:

- `actors.Actor`
- `actors.MessageBus` (abstract prototype)
- `actors.LocalMessageBus` using a local, in process message bus.
- `actors.PubNubMessageBus` using [PubNub](http://www.pubnub.com/).
- `actors.AMQPMessageBus` using the [AMPQ](http://www.amqp.org/) protocol,
  for example via [RabbitMQ](https://www.rabbitmq.com/) servers.


### Actor

Constructor:

```js
var actor = new actors.Actor([id: String]);
```

Methods:

- `Actor.send(to: String, message: String [, data: *])`
  Send a message to an other actor.
- `Actor.onMessage(from: String, message: String [, data: *])`
  Receive a message from an actor. The default implementation of this function
  iterates over all message listeners registered via `Actor.on`. The method can
  be overloaded if needed.
- `Actor.on(pattern: String | RegExp | Function, callback: Function)`
  Register an message listener, which is triggered when a message comes in which
  matches given pattern. The pattern can be a String (exact match), a
  regular expression, or a test function which is invoked as `pattern(message)`
  and must return true or false.
- `Actor.off(pattern: String | RegExp | Function, callback: Function)`
  Unegister a registered message listener.
- `Actor.connect(messagebus: MessageBus [, callback: Function])`
  Connect the actor to a message bus. The library comes with two message bus
  implementations: `LocalMessageBus` and `PubNubMessageBus`. One can add more
  implementations if needed. An actor can be connected to multiple message
  busses.
- `Actor.disconnect(messagebus: MessageBus)`
  Disconnect the actor from a message bus.


### MessageBus

The library provideds implementations of the abstract prototype `MessageBus`:
`LocalMessageBus` and `PubNubMessageBus`. It is quite easy to implement a
message bus for other messaging services.

`MessageBus` has the following API:

Constructor:

```js
var bus = new MessageBus([config: Object]);
```

Methods:

- `MessageBus.connect(id: String, onMessage: Function [, onConnect: Function])`
  Connect a peer with given `id`. When a message for the peer comes in,
  the callback function `onMessage` is invoked as `onMessage(from: String,
  message: String [, data: *])`. An optional callback `onConnect` is triggered
  after the connection is created.
- `MessageBus.disconnect(id: String)`
  Disconnect a peer with given `id`.
- `MessageBus.send(from: String, to: String, message: String [, data: *])`
  Send a message via the message bus.



## Test

First install the project dependencies:

    npm install

Then run the tests:

    npm test


## To do

- Implement a mixin pattern to turn existing objects into an actor.
- Maybe change the API to Promise based.
