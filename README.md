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

function MyAgent(id, services) {
  // execute super constructor
  eve.Agent.call(this, id);
  
  // connect to all transports provided by the service manager
  // fall back to the default service manager when not provided
  services = services || eve.defaultServiceManager;
  this.connect(services.transports.get());
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

MyAgent.prototype.receive = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

module.exports = MyAgent;
```

This agent can be used with the default service manager like:

```js
var eve = require('simple-actors');
var MyAgent = require('./MyAgent');

var agent1 = new MyAgent('agent1');
var agent2 = new MyAgent('agent2');

// send a message to agent 1
agent2.sayHi('agent1');
```

Or with a provided service manager:

```js
var eve = require('simple-actors');
var MyAgent = require('./MyAgent');

var config = {
  transports: [
    {
      type: 'distribus'
    }
  ]
};
var services = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', services);
var agent2 = new MyAgent('agent2', services);

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
  // fall back to the default service manager when not provided
  services = services || eve.defaultServiceManager;
  this.connect(services.transports.get());
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

MyAgent.prototype.receive = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

module.exports = MyAgent;
```

To load a ServiceManager and instantiate a few agents:

```js
var eve = require('simple-actors');
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
var eve = require('simple-actors');
var MyAgent = require('./MyAgent');

var config = require('./config.json');
var services = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', services);
var agent2 = new MyAgent('agent2', services);

// send a message to agent 1
agent2.sayHi('agent1');
```

### defaultServiceManager

For ease of use, evejs provides a `defaultServiceManager`, which has loaded
a `LocalTransport`. Instead of providing a service manager when constructing
and agent, the agent can test whether a service manager is provided and if not,
fall back on the `defaultServiceManager`. This means that agents can be created
and used without configuring and passing a service manager.

```js
var eve = require('simple-actors');

function MyAgent(id, services) {
  // execute super constructor
  eve.Agent.call(this, id);
  
  // connect to all transports provided by the service manager
  // fall back to the default service manager when not provided
  services = services || eve.defaultServiceManager;
  this.connect(services.transports.get());
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

MyAgent.prototype.receive = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

module.exports = MyAgent;
```

The agent `MyAgent` can be created with an optional service manager:

```js
// use default service manager
var agent1 = new MyAgent(id);

// use the provided service manager
var services = new eve.ServiceManager(...);
var agent1 = new MyAgent(id, services);
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
- `eve.ServiceManager` construct a service manager.
- `eve.defaultServiceManager` a default, global instance of a service manager, 
  loaded with a `LocalTransport`

### Agent

Constructor:

```js
var agent = new eve.Agent([id: String]);
```

Methods:

- `Agent.send(to: String, message: String)`  
  Send a message to an other agent.
- `Agent.receive(from: String, message: String)`  
  Receive a message from an agent. The default implementation of this function
  iterates over all message listeners registered via `Agent.on`. The method can
  be overloaded if needed.
- `Agent.on(pattern: String | RegExp | Function, callback: Function)`  
  Register an message listener, which is triggered when a message comes in which
  matches given pattern. The pattern can be a String (exact match), a
  regular expression, or a test function which is invoked as `pattern(message)`
  and must return true or false.
  Note that `Agent.on` only works when `Agent.receive` is not overwritten
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

- `Transport.connect(id: String, receive: Function [, onConnect: Function])`  
  Connect an agent with given `id`. When a message for the agent comes in,
  the callback function `receive` is invoked as `receive(from: String,
  message: String)`. The method returns a Promise which resolves when the 
  connection is created.
- `Transport.disconnect(id: String)`  
  Disconnect an agent with given `id`.
- `Transport.send(from: String, to: String, message: String)`  
  Send a message via the transport.

### ServiceManager

A ServiceManager is an object to manage services for the agents. Currently,
the only available service is transports. Typically, a service manager is 
provided to an agent on construction, allowing the agent to connect to relevant 
services.

A ServiceManager is created as:

```js
var services = new eve.ServiceManager();
var services = new eve.ServiceManager(config: Object);
```

Where `config` is an optional JSON object structured as:

```js
{
  "transports": [
    {
      "type": STRING,
      ... transport dependent params
    },
    ...
  ]
}
```

Properties:

- `transports: TransportManager` see [TransportManager](#transportmanager)

### TransportManager

A TransportManager manages transports for reuse by multiple agents.

A TransportManager is created as:

```js
var services = new eve.TransportManager();
var services = new eve.TransportManager(config: Array);
```

Where `config` is an optional JSON array structured as:

```js
[
  {
    "type": STRING,
    ... transport dependent params
  },
  ...
]
```

Available types: `"amqp"`, `"distribus"`, `"local"`, and `"pubnub"`.

Methods:

- `add(transport: Transport) : Transport`  
  Add a loaded transport to the manager. Returns the transport itself.
- `get([type: string]) : Transport`  
  Get transports. When optional parameter `type` is provided, the transports
  are filtered by this type. When there are no transports found, an empty 
  array is returned.
  Available types are: 'amqp',  'distribus', 'local', 'pubnub'.
- `getOne([type: string]) : Transport`  
  Get a single transport. When optional parameter `type` is provided, the transports
  are filtered by this type. 
  Available types are: 'amqp',  'distribus', 'local', 'pubnub'. When type is defined, 
  the first transport of this type is returned. When undefined, the first 
  loaded transport of any type is returned.
  Throws an error when no matching transport is found.
- `load(config: Object) : Transport`  
  Load a transport based on JSON configuration. Returns the loaded transport
- `registerType(constructor: Function)`
  Register a new type of transport. This transport can then be loaded via
  configuration. When called, the constructor must generate a transport which
  is an instance of `Transport`.
  
## Test

First install the project dependencies:

    npm install

Then run the tests:

    npm test
