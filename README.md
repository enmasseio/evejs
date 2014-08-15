# evejs

JavaScript version of Eve, the web based agent platform.


## Install

Install the module via npm:

    npm install simple-actors

*(In the future the module will be renamed to `npm install evejs`)*


## Use

### Basic usage

```js
var eve = require('simple-actors');

var transport = new eve.transport.LocalTransport();
var agent1 = new eve.Agent('agent1');
var agent2 = new eve.Agent('agent2');

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

Evejs can be used together with [babble](https://github.com/enmasseio/babble), extending the agents with support for dynamic communication flows.

Example usage: 

```js
var eve = require('simple-actors');
var babble = require('babble');

// create two agents and babblify them
var emma = babble.babblify(new eve.Agent('emma'));
var jack = babble.babblify(new eve.Agent('jack'));

// create a transport and connect both agents
var transport = new eve.transport.LocalTransport();
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

### Create an Agent

To create an agent prototype `MyAgent` extending `eve.Agent`, create a 
file **MyAgent.js** containing:

```js
var eve = require('simple-actors');

function MyAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

MyAgent.prototype.onMessage = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

module.exports = MyAgent;
```

This agent can be used like:

```js
var eve = require('../index');
var MyAgent = require('./MyAgent');

var transport = new eve.transport.LocalTransport();

var agent1 = new MyAgent('agent1');
var agent2 = new MyAgent('agent2');

agent1.connect(transport);
agent2.connect(transport);

// send a message to agent 1
agent2.sayHi('agent1');
```

### ServiceManager

With evejs, one can programmatically load transports and create agents.
Evejs comes with a ServiceManager which enables loading transports from JSON 
configuration.

When creating an Agent, a service manager can be required as constructor argument. 
This allows the Agent to select services that it needs by itself, for example
by connecting to a transport on creation. Create a file **MyAgent.js** containing:

```js
var eve = require('simple-actors');

function MyAgent(id, services) {
  // execute super constructor
  eve.Agent.call(this, id);
  
  // connect to all transports provided by the service manager
  this.connect(services.transports.get());
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

MyAgent.prototype.onMessage = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

module.exports = MyAgent;
```

To load a ServiceManager and instantiate a few agents:

```js
var eve = require('../index');
var MyAgent = require('./MyAgent');

var config = {
  transports: [
    {
      type: 'local'
    }
  ]
};
var services = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', services);
var agent2 = new MyAgent('agent2', services);

// send a message to agent 1
agent2.sayHi('agent1');
```

The configuration can be saved in a separate file `config.json`:

```json
{
  "transports": [
    {
      "type": "local"
    }
  ]
}
```

Then, the configuration can be loaded into the ServiceManager like:

```js
var eve = require('../index');
var MyAgent = require('./MyAgent');

var config = require('./config.json');
var services = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', services);
var agent2 = new MyAgent('agent2', services);

// send a message to agent 1
agent2.sayHi('agent1');
```


## API

The library contains the following prototypes:

- `eve.Agent`
- `eve.transport.Transport` (abstract prototype)
- `eve.transport.LocalTransport` using a local, in process transport.
- `eve.transport.DistribusTransport` using [distribus](https://github.com/enmasseio/distribus).
- `eve.transport.PubNubTransport` using [PubNub](http://www.pubnub.com/).
- `eve.transport.AMQPTransport` using the [AMPQ](http://www.amqp.org/) protocol,
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
  Note that `Agent.on` only works when `Agent.onMessage` is not overwritten
  by a custom Agent prototype.
- `Agent.off(pattern: String | RegExp | Function, callback: Function)`  
  Unregister a registered message listener.
- `Agent.connect(transport: Transport [, id: string]) : Promise<Agent, Error>`  
  Connect the agent to a transport. The library comes with multiple message 
  transport implementations (see [API](#api). An agent can be connected to 
  multiple transports. By default, the agent connects to the transport with
  it's own id. It is possible to provide an alternative id instead by specifying
  this as second argument.
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
