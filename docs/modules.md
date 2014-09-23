# Modules

An agent can be extended with modules, offering additional functionality.
evejs comes with a number of built in modules. Usage:

    agent.extend(moduleName);
    agent.moduleName = agent.loadModule(moduleName);

Evejs contains the following built-in modules:

- [Babble](#babble)
- [Pattern](#pattern)
- [Request](#request)
- [RPC](#rpc)


## Babble

Babble enables dynamic communication flows between agents by means of 
conversations. A conversation is modeled as a control flow diagram containing 
blocks `ask`, `tell`, `listen`, `iif`, `decide`, and `then`. Each block can 
link to a next block in the control flow. Conversations are dynamic: 
a scenario is build programmatically, and the blocks can dynamically determine 
the next block in the scenario. During a conversation, a context is available 
to store the state of the conversation.

Evejs can be used together with [babble](https://github.com/enmasseio/babble), 
extending the agents with support for dynamic communication flows. 

Usage:

    agent.extend('babble');

The full API and documentation can be found at the project page of babble:

https://github.com/enmasseio/babble

Example:

Create a file **BabbleAgent.js** with the following contents:

```js
var babble = require('babble');
var eve = require('evejs');

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


## Pattern

The `'pattern'` module extends an agent with  support for pattern listening. 
Incoming messages can be matched against patterns. 
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

Example:

Save the following code as **PatternAgent.js**:

```js
var eve = require('evejs');

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


## Request

The `'request'` module adds support for sending requests and awaiting a reply.

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

Example:

Create a file **RequestAgent.js** containing:

```js
var eve = require('evejs');

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


## RPC

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

- `agent.request(to: string | Object, {method: String, params: *, [id: String, jsonrpc: '2.0']})`  
  Send a request. The function returns a promise which resolves with the reply comes in. Only the 'method' and the 'params' fields are required. Evejs will give the message an UUID and add the jsonrpc field as required by the JSON RPC 2.0 spec. The reply is delivered in the JSON RPC response format.

Example:

Using the `rpc` module, agents can easily send a message and await a response.
Create a file **RPCAgent.js** containing:

```js
var eve = require('evejs');

function RPCAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // load the RPC module
  this.rpc = this.loadModule('rpc', this.rpcFunctions);

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
};

module.exports = RPCAgent;
```

Usage:

```js
var RPCAgent = require('./RPCAgent');

// create two agents
var agent1 = new RPCAgent('agent1');
var agent2 = new RPCAgent('agent2');

// send a message to agent1
var message = {method:'add', params: {a:1, b:3}};
agent2.rpc.request('agent1', message).then(function(reply) {
    console.log('The agent told me that', params.a, '+', params.b, '=', reply.result);
  });
}
```
