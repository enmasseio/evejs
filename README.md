# evejs

JavaScript version of Eve, the web based agent platform.


## Install

Install the module via npm:

    npm install simple-actors

*(In the future the module will be renamed to `npm install evejs`)*


## Use

An agent basically has a methods `send`, `receive`, `connect` and `disconnect`.
An agent can be extended with modules like `pattern` and `request`. There is
a central configuration `eve.system` which can be used to load transports. 
The loaded transports can be used by agents to communicate with each other.

To set up a system with eve agents:

- Create an agent class extending `eve.Agent`. A template for a custom agent is:

  ```js
  var eve = require('simple-actors');
  
  function MyAgent(id) {
    eve.Agent.call(this, id);
  
    // ...
  }
  
  MyAgent.prototype = Object.create(eve.Agent.prototype);
  MyAgent.prototype.constructor = MyAgent;
  
  MyAgent.prototype.receive = function (from, message) {
    // ...
  };
  
  module.exports = MyAgent;
  ```

- Configure `eve.system`, load transports and other services.

  ```js
  eve.system.init({
    transports: [
      {
        type: 'distribus'
      }
    ]
  });
  ```

- Create instances of an agent:

  ```js
  var agent1 = new MyAgent('agent1');
  ```

- Connect an agent to one or multiple transports. This is normally done in
  the agents constructor function:
  
  ```js
  agent1.connect(eve.system.transports.getAll());
  ```


### Basic usage

To create a simple agent class, create a file [**HelloAgent.js**](examples/agents/HelloAgent.js) with the 
following code:

```js
var eve = require('simple-actors');

function HelloAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
HelloAgent.prototype = Object.create(eve.Agent.prototype);
HelloAgent.prototype.constructor = HelloAgent;

HelloAgent.prototype.sayHello = function(to) {
  this.send(to, 'Hello ' + to + '!');
};

HelloAgent.prototype.receive = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));

  if (message.indexOf('Hello') === 0) {
    // reply to the greeting
    this.send(from, 'Hi ' + from + ', nice to meet you!');
  }
};

module.exports = HelloAgent;
```

This agent class can be used as follows. Note that the agents talk to each 
other via a `LocalTransport` which is instantiated in `eve.system` by default.

```js
var HelloAgent = require('./HelloAgent');

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent1
agent2.send('agent1', 'Hello agent1!');
```


### Pattern

Agents can be extended with support for a pattern listener. Incoming messages
can be matched against patterns. Save the following code as [**PatternAgent.js**](examples/agents/PatternAgent.js):

```js
var eve = require('simple-actors');

function PatternAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with pattern listening functionality
  this.extend('pattern');

  // listen for messages containing 'hello' (case insensitive)
  this.listen(/hello/i, function (from, message) {
    // reply to the greeting
    this.send(from, 'Hi ' + from + ', nice to meet you!');
  });

  // listen for any message
  this.listen(/./, function (from, message) {
    console.log(from + ' said: ' + message);
  });

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
PatternAgent.prototype = Object.create(eve.Agent.prototype);
PatternAgent.prototype.constructor = PatternAgent;

module.exports = PatternAgent;
```

Usage:

```js
var PatternAgent = require('./PatternAgent');

// create two agents
var agent1 = new PatternAgent('agent1');
var agent2 = new PatternAgent('agent2');

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
```



### Request

Using the `request` module, agents can easily send a message and await a response.
Create a file [**RequestAgent.js**](examples/agents/RequestAgent.js) containing:

```js
var eve = require('simple-actors');

function RequestAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with support for requests
  this.extend('request');

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RequestAgent.prototype = Object.create(eve.Agent.prototype);
RequestAgent.prototype.constructor = RequestAgent;

// implement the receive method
RequestAgent.prototype.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // return value is send back as reply in case of a request
  return 'Hi ' + from + ', nice to meet you!';
};

module.exports = RequestAgent;
```

Usage:

```js
var RequestAgent = require('./RequestAgent');

// create two agents
var agent1 = new RequestAgent('agent1');
var agent2 = new RequestAgent('agent2');

// send a request to agent 1, await the response
agent2.request('agent1', 'Hello agent1!')
    .then(function(reply) {
      console.log('reply: ' + reply);
    });
```

### RPC

Using the `rpc` module, agents can easily send a message and await a response.
Create a file [**RPCAgent.js**](examples/agents/RPCAgent.js) containing:

```js
var eve = require('../../index');

function RPCAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // load the RPC module
  this.rpc = this.loadModule('rpc',this.rpcFunctions);

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RPCAgent.prototype = Object.create(eve.Agent.prototype);
RPCAgent.prototype.constructor = RPCAgent;

// create an object containing all RPC functions.
RPCAgent.prototype.rpcFunctions = {};

// create an RPC function
RPCAgent.prototype.rpcFunctions.add = function(params, from) {
  return params.a + params.b;
}



module.exports = RPCAgent;
```

Usage:

```js
var RPCAgent = require('./agents/RPCAgent');

// create two agents
var agent1 = new RPCAgent('agent1');
var agent2 = new RPCAgent('agent2');

// send a message to agent1
var message = {method:"add", params:{a:1,b:3}};
agent2.rpc.request("agent1", message).then(function(reply) {
    console.log("The agent told me that",params.a, "+",params.b,"=",reply.result);
  });
}
```
### Babble

Evejs can be used together with [babble](https://github.com/enmasseio/babble), extending the agents with support for dynamic communication flows. 

Create a file [**BabbleAgent.js**](examples/agents/BabbleAgent.js) with the
following contents:

```js
var babble = require('babble');
var eve = require('simple-actors');

function BabbleAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // babblify the agent
  this.extend('babble');

  // add a conversation listener
  this.listen('hi')
      .listen(function (message, context) {
        console.log(context.from + ': ' + message);
        return message;
      })
      .decide(function (message, context) {
        return (message.indexOf('age') != -1) ? 'age' : 'name';
      }, {
        'name': babble.tell('hi, my name is ' + this.id),
        'age':  babble.tell('hi, my age is ' + this.props.age)
      });

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
BabbleAgent.prototype = Object.create(eve.Agent.prototype);
BabbleAgent.prototype.constructor = BabbleAgent;

// have a conversation with an other agent
BabbleAgent.prototype.talk = function (to) {
  var name = this.id;
  var age = this.props.age;

  this.tell(to, 'hi')
      .tell(function (message, context) {
        if (Math.random() > 0.5) {
          return 'my name is ' + name;
        } else {
          return 'my age is ' + age;
        }
      })
      .listen(function (message, context) {
        console.log(context.from + ': ' + message);
      });
};

module.exports = BabbleAgent;
```

Usage:

```js
var BabbleAgent = require('./BabbleAgent');

// create two agents
var emma = new BabbleAgent('emma', {age: 27});
var jack = new BabbleAgent('jack', {age: 25});

// let jack have a conversation with emma
jack.talk('emma');
```


### ServiceManager

With evejs, one can programmatically load transports and create agents.
Evejs comes with a ServiceManager which enables loading transports from JSON 
configuration.

Evejs has a singleton service manager available at `eve.system`. By default,
a `LocalTransport` is loaded in the service manager, allowing local agents
to communicate with each other without need for additional configuration.

The service manager can be configured like

```js
var eve = require('simple-actors');
var HelloAgent = require('./examples/agents/HelloAgent');

// configure eve
eve.system.init({
  transports: [
    {
      type: 'distribus',
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

agent2.sayHello('agent1');
```

The configuration can be saved in a separate configuration file like **config.json**:

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
var HelloAgent = require('./examples/agents/HelloAgent');

// configure eve
var config = require('./config.json');
eve.system.init(config);

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

agent2.sayHello('agent1');
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
- `eve.system` a default, global instance of a service manager, 
  loaded with a `LocalTransport`.

### Agent

Constructor:

```js
var agent = new eve.Agent([id: string]);
```

Properties:

- `Agent.ready : Promise`  
  A promise which resolves when all connections of the agent are ready.

Methods:

- `Agent.send(to: string, message: string)`  
  Send a message to an other agent. Parameter `to` is either:
  
  - A string "agentId", the id of the recipient. Will be send
    via the default transport or when there is no default
    transport via the first connected transport.
  - A string "agentId@transportId" Only usable locally, not
    for sharing an address with remote agents.
  - A string "protocol://networkId/agentId". This is a sharable
    identifier for an agent.

- `Agent.extend(module: string | Array.<string> [, options: Object]): Agent`  
  Extend an agent with modules (mixins). Available modules: 
  - `'pattern'`  
    Add support for pattern listening to an object. The agent will be extended
    with functions `listen` and `unlisten`. Cannot be used in conjunction with
    module `'babble'`.
  
  - `'request'`  
    Add support for sending requests and immediately retrieving a reply. The 
    agent will be extended with a function `request`.
  
  - `'babble'`  
    Babblify an agent. The babblified agent will be extended with functions
    `ask`, `tell`, and `listen`. Cannot be used in conjunction with
    module `'pattern'`.
  
  The function `extend` returns the agent itself, which allows chaining multiple
  extenstions.

- `Agent.loadModule(module: string | Array.<string> [, options: Object]): Module`  
  Load a module for an agent. This is the same as `Agent.extend`, except that 
  the functions offered by the module are not attached to the Agent itself, but
  returned as object. This allows storing the new functions in a separate 
  namespace, preventing conflicts between modules or the agent itself. 

- `Agent.receive(from: string, message: string)`  
  Receive a message from an agent. The method should be overloaded with an
  implementation doing something with incoming messages.

- `Agent.connect(transport: Transport | Transport[] | string | string[] [, id: string]) : Promise<Agent, Error>`  
  Connect the agent to a transport instance or the id of a transport loaded 
  in `eve.system`. Parameter `transport` can be an Array to connect to multiple
  transports at once. Eve comes with multiple message transport implementations 
  (see [API](#api). 
  By default, the agent connects to the transport with it's 
  own id. It is possible to provide an alternative id instead by specifying
  this as second argument.

- `Agent.disconnect([transport: Transport | Transport[] | string | string[]])`  
  Disconnect the agent from a transport or multiple transports. When parameter
  `transport` is not provided, the agent will be disconnected from all 
  transports.


### Modules

An agent can be extended with modules, offering additional functionality.
evejs comes with a number of built in modules. Usage:

    agent.extend(moduleName);
    agent.moduleName = agent.loadModule(moduleName);

#### Pattern

The `'pattern'` module extends an agent with  support for pattern listening. 
The agent will be extended with functions `listen` and `unlisten`. Cannot be 
used in conjunction with module `'babble'`.

Usage:

    agent.extend('pattern' [, options]);

Available options:

- `stopPropagation: boolean`  
  When true, a message will not be propagated to other pattern listeners as 
  soon as there is a match with one of the listeners. Thus, up to one listener 
  is triggered on an incoming message. Default value is false.
  
  When false (default), a message will be delivered at all matching pattern 
  listeners. When true, a message will be be delivered at the first matching 
  pattern listener only.

Methods:

- `Agent.listen(pattern: string | RegExp | Function, callback: Function)`  
  Register an pattern listener, which is triggered when a message comes in which
  matches given pattern. The pattern can be a string (exact match), a
  regular expression, or a test function which is invoked as `pattern(message)`.
  When a message matches the pattern, the `callback` function is invoked as
  `callback(from, message)`.

- `Agent.unlisten(pattern: string | RegExp | Function, callback: Function)`  
  Unregister a registered pattern listener.

#### Request

The `'request'` module adds support for sending requests and immediately 
retrieving a reply.

Usage:

    agent.extend('request' [, options]);

Available options:

- `timeout: number`  
  Specify the timeout for a request in milliseconds. When no reply is received
  before the timeout is exceeded, the requests promise is rejected.
  Default value is 60000 ms.

Methods:

- `Agent.request(to: string | Object, message: string, message: *)`    
  Send a request. The function returns a promise which resolves with the reply
  comes in.

#### Babble

Babble enables dynamic communication flows between agents by means of 
conversations. A conversation is modeled as a control flow diagram containing 
blocks `ask`, `tell`, `listen`, `iif`, `decide`, and `then`. Each block can 
link to a next block in the control flow. Conversations are dynamic: 
a scenario is build programmatically, and the blocks can dynamically determine 
the next block in the scenario. During a conversation, a context is available 
to store the state of the conversation.

The module `'babble'` cannot be used in conjunction with module `'babble'`.

Usage:

    agent.extend('babble');

The full API and documentation can be found at the project page of babble:

https://github.com/enmasseio/babble

#### RPC

The RPC module allows your agents to communicate using JSON RPC 2.0. This can be used over all transport implementations. When using the HTTP transport, the request and reply are performed in the same HTTP session.

Usage:
```
    agent.rpc = agent.loadModule('rpc',options);
```
In the options you can define which functions you want to open up the the RPC module. You can supply these as an Object or an Array of function names. The possible ways to define the options are shown here:

```
agent.add = function (params, [from]) {return params.a + params.b; }
var options = ['add']
```
```
agent.add = function (params, [from]) {return params.a + params.b; }
var options = {add: agent.add};
```
```
agent.rpcFunctions = {};
agent.rpcFunctions.add = function (params, [from]) {return params.a + params.b; }
var options = agent.rpcFunctions;
```

Methods:

```
agent.request(to: string | Object, 
{method: String, params: *, [id: String, jsonrpc: '2.0']});    
```

  Send a request. The function returns a promise which resolves with the reply
  comes in. Only the 'method' and the 'params' fields are required. Evejs will give the message an UUID and add the jsonrpc field as required by the JSON RPC 2.0 spec. The reply is delivered in the JSON RPC response format.
  
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

- `Transport.connect(id: string, receive: Function) : Connection`    
  Connect an agent with given `id`. When a message for the agent comes in,
  the callback function `receive` is invoked as `receive(from: string,
  message: string)`. The method returns a [`Connection`](#connection), which
  can be used to send messages.

### Connection

When a connection is opened by a [`Transport`](#transport), a `Connection` is 
returned.

Constructor:

```js
var connection = new Connection(transport: Transport, id: string, receive: function);
```

Properties:

- `Transport.ready: Promise`  
  The ready state of the transport. When ready, the properties Promise resolves.

Methods:

- `Transport.close()`  
  Close the connection.
- `Transport.send(to: string, message: string)`  
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
- `get(id: string) : Transport`  
  Get a single transport by it's id.
  Throws an error when no matching transport is found.
- `getAll() : Transport[]`  
  Get all transports.
- `getByType([type: string]) : Transport[]`  
  Get transports. When optional parameter `type` is provided, the transports
  are filtered by this type. When there are no transports found, an empty 
  array is returned.
  Available types are: 'amqp',  'distribus', 'local', 'pubnub'.
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
