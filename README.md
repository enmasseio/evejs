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

### Babble

simple-actors can be used together with [babble](https://github.com/enmasseio/babble), extending the actors with support for dynamic communication flows.

Example usage: 

```js
var actors = require('simple-actors');
var babble = require('babble');

// create two actors and babblify them
var emma = babble.babblify(new actors.Actor('emma'));
var jack = babble.babblify(new actors.Actor('jack'));

// create a message bus and connect both actors
var bus = new actors.LocalMessageBus();
emma.connect(bus);
jack.connect(bus);

emma.listen('hi')
    .listen(printMessage)
    .decide(function (message, context) {
      return (message.indexOf('age') != -1) ? 'age' : 'name';
    }, {
      'name': babble.tell('hi, my name is emma'),
      'age':  babble.tell('hi, my age is 27')
    });

jack.tell('emma', 'hi')
    .tell(function (message, context) {
      if (Math.random() > 0.5) {
        return 'my name is jack'
      } else {
        return 'my age is 25';
      }
    })
    .listen(printMessage);

function printMessage (message, context) {
  console.log(context.from + ': ' + message);
  return message;
}
```


## API

The library contains the following prototypes:

- `actors.Actor`
- `actors.MessageBus` (abstract prototype)
- `actors.LocalMessageBus` using a local, in process message bus.
- `actors.DistribusMessageBus` using [distribus](https://github.com/enmasseio/distribus).
- `actors.PubNubMessageBus` using [PubNub](http://www.pubnub.com/).
- `actors.AMQPMessageBus` using the [AMPQ](http://www.amqp.org/) protocol,
  for example via [RabbitMQ](https://www.rabbitmq.com/) servers.


### Actor

Constructor:

```js
var actor = new actors.Actor([id: String]);
```

Methods:

- `Actor.send(to: String, message: String)`  
  Send a message to an other actor.
- `Actor.onMessage(from: String, message: String)`  
  Receive a message from an actor. The default implementation of this function
  iterates over all message listeners registered via `Actor.on`. The method can
  be overloaded if needed.
- `Actor.on(pattern: String | RegExp | Function, callback: Function)`  
  Register an message listener, which is triggered when a message comes in which
  matches given pattern. The pattern can be a String (exact match), a
  regular expression, or a test function which is invoked as `pattern(message)`
  and must return true or false.
- `Actor.off(pattern: String | RegExp | Function, callback: Function)`  
  Unregister a registered message listener.
- `Actor.connect(messagebus: MessageBus) : Promise<Actor, Error>`  
  Connect the actor to a message bus. The library comes with multiple message 
  bus implementations (see [API](#api). An actor can be connected to multiple 
  message buses.
- `Actor.disconnect(messagebus: MessageBus)`  
  Disconnect the actor from a message bus.


### MessageBus

The library provides multiple `MessageBus` implementations: `LocalMessageBus`,
`PubNubMessageBus`, `AMQPMessageBus`, and `DistribusMessageBus`. It is quite 
easy to implement a message bus for other messaging services.

`MessageBus` has the following API:

Constructor:

```js
var bus = new MessageBus([config: Object]);
```

Methods:

- `MessageBus.connect(id: String, onMessage: Function [, onConnect: Function])`  
  Connect a peer with given `id`. When a message for the peer comes in,
  the callback function `onMessage` is invoked as `onMessage(from: String,
  message: String)`. The method returns a Promise which resolves when the 
  connection is created.
- `MessageBus.disconnect(id: String)`  
  Disconnect a peer with given `id`.
- `MessageBus.send(from: String, to: String, message: String)`  
  Send a message via the message bus.



## Test

First install the project dependencies:

    npm install

Then run the tests:

    npm test


## To do

- Implement a mixin pattern to turn existing objects into an actor.
- Maybe change the API to Promise based.
