# evejs

JavaScript version of Eve, the web based agent platform.


## Install

Install the module via npm:

    npm install simple-actors

*(Please let me know if you know a better name for this library...)*


## Use

Example usage:

```js
var eve = require('simple-actors');

var transport = new eve.LocalTransport();
    agent1 = new eve.Agent('agent1');
    agent2 = new eve.Agent('agent2');

agent1.connect(transport);
agent2.connect(transport);

// agent1 listens for messages containing 'hi' or 'hello' (case insensitive)
agent1.on(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// agent2 listens for any message
agent2.on(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
```

### Babble

simple-actors can be used together with [babble](https://github.com/enmasseio/babble), extending the agents with support for dynamic communication flows.

Example usage: 

```js
var eve = require('simple-actors');
var babble = require('babble');

// create two agents and babblify them
var emma = babble.babblify(new eve.Agent('emma'));
var jack = babble.babblify(new eve.Agent('jack'));

// create a transport and connect both agents
var transport = new eve.LocalTransport();
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

- `eve.Agent`
- `eve.Transport` (abstract prototype)
- `eve.LocalTransport` using a local, in process transport.
- `eve.DistribusTransport` using [distribus](https://github.com/enmasseio/distribus).
- `eve.PubNubTransport` using [PubNub](http://www.pubnub.com/).
- `eve.AMQPTransport` using the [AMPQ](http://www.amqp.org/) protocol,
  for example via [RabbitMQ](https://www.rabbitmq.com/) servers.


### Agent

Constructor:

```js
var agent = new eve.Agent([id: String]);
```

Methods:

- `Agent.send(to: String, message: String)`  
  Send a message to an other agent.
- `Agent.onMessage(from: String, message: String)`  
  Receive a message from an agent. The default implementation of this function
  iterates over all message listeners registered via `Agent.on`. The method can
  be overloaded if needed.
- `Agent.on(pattern: String | RegExp | Function, callback: Function)`  
  Register an message listener, which is triggered when a message comes in which
  matches given pattern. The pattern can be a String (exact match), a
  regular expression, or a test function which is invoked as `pattern(message)`
  and must return true or false.
- `Agent.off(pattern: String | RegExp | Function, callback: Function)`  
  Unregister a registered message listener.
- `Agent.connect(transport: Transport) : Promise<Agent, Error>`  
  Connect the agent to a transport. The library comes with multiple message 
  transport implementations (see [API](#api). An agent can be connected to 
  multiple transports.
- `Agent.disconnect(transport: Transport)`  
  Disconnect the agent from a a transport.


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

- Implement a mixin pattern to turn existing objects into an agent.
- Maybe change the API to Promise based.
