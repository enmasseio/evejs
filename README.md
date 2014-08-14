# evejs

JavaScript version of Eve, the web based agent platform.


## Install

Install the module via npm:

    npm install simple-actors

*(Please let me know if you know a better name for this library...)*


## Use

Example usage:

```js
var actors = require('simple-actors');

var transport = new actors.LocalTransport();
    actor1 = new actors.Actor('actor1');
    actor2 = new actors.Actor('actor2');

actor1.connect(transport);
actor2.connect(transport);

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

// create a transport and connect both actors
var transport = new actors.LocalTransport();
emma.connect(transport);
jack.connect(transport);

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
- `actors.Transport` (abstract prototype)
- `actors.LocalTransport` using a local, in process transport.
- `actors.DistribusTransport` using [distribus](https://github.com/enmasseio/distribus).
- `actors.PubNubTransport` using [PubNub](http://www.pubnub.com/).
- `actors.AMQPTransport` using the [AMPQ](http://www.amqp.org/) protocol,
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
- `Actor.connect(transport: Transport) : Promise<Actor, Error>`  
  Connect the actor to a transport. The library comes with multiple message 
  transport implementations (see [API](#api). An actor can be connected to 
  multiple transports.
- `Actor.disconnect(transport: Transport)`  
  Disconnect the actor from a a transport.


### Transport

The library provides multiple `Transport` implementations: `LocalTransport`,
`PubNubTransport`, `AMQPTransport`, and `DistribusTransport`. It is quite 
easy to implement a support for other messaging services.

`Transport` has the following API:

Constructor:

```js
var transport = new Transport([config: Object]);
```

Methods:

- `Transport.connect(id: String, onMessage: Function [, onConnect: Function])`  
  Connect a peer with given `id`. When a message for the peer comes in,
  the callback function `onMessage` is invoked as `onMessage(from: String,
  message: String)`. The method returns a Promise which resolves when the 
  connection is created.
- `Transport.disconnect(id: String)`  
  Disconnect a peer with given `id`.
- `Transport.send(from: String, to: String, message: String)`  
  Send a message via the transport.



## Test

First install the project dependencies:

    npm install

Then run the tests:

    npm test


## To do

- Implement a mixin pattern to turn existing objects into an actor.
- Maybe change the API to Promise based.
