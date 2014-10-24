# evejs

Eve is a multipurpose, web-based agent platform. Eve envisions to be an open and dynamic environment where agents can live and act anywhere: in the cloud, on smartphones, on desktops, in browsers, robots, home automation devices, and others. The agents communicate with each other using simple, existing protocols (JSON-RPC) over existing transport layers (HTTP, AMQP, WebSockets, etc.), offering a language and platform agnostic solution.

Currently there are two main implementations of Eve: one in Java and one in JavaScript. This is the JavaScript version of Eve (evejs), running in node.js and on the browser. More on the general concepts and about other implementations can be found on the official website: http://eve.almene.com.

Eve is being developed by [Almende B.V.](http://www.almende.com), a Dutch research company specialized in information and communication technologies. Central to Almende's research is the concept of self-organization. Almende believes that computer systems and technology should support people in performing their professional tasks and organizing their daily lives. This means that ICT should learn to work for and with people, according to their individual wishes and demands.


## Install

Install the module via npm:

    npm install evejs


## Use

An agent basically has a methods `send`, `receive`, `connect` and `disconnect`.
An agent can be extended with modules like `pattern` and `request`. There is
a central configuration `eve.system` which can be used to load transports. 
The loaded transports can be used by agents to communicate with each other.

To set up a system with eve agents:

- Create an agent class extending `eve.Agent`. A template for an agent is:

  ```js
  var eve = require('evejs');
  
  function MyAgent(id) {
    // execute super constructor
    eve.Agent.call(this, id);
    
    // extend the agent with modules (choose from 
    // 'babble', 'pattern', 'request', and 'rpc')
    this.extend('request');
    
    // connect to some or all transports
    this.connect(eve.system.transports.getAll());
  }
  
  // extend the eve.Agent prototype
  MyAgent.prototype = Object.create(eve.Agent.prototype);
  MyAgent.prototype.constructor = MyAgent;
  
  MyAgent.prototype.receive = function (from, message) {
    // handle incoming messages...
  };
  
  module.exports = MyAgent;
  ```

- To send and receive messages, each agent has a method `send(to, message)` and 
`receive(from, message)`. A message can be send to and agent by specifying either 
the agents full url, or just the agents id. In the latter case, the agent will 
send the message via the transport marked as *default*.

  ```js
  agent1.send('distribus://networkId/agent2', 'hello agent2!');
  agent1.send('agent2', 'hello agent2!'); // send via the default transport
  ```
  
  The *networkId* of a transport can be found at `transport.networkId`.

- Configure `eve.system`, initialize transports and other services.

  ```js
  eve.system.init({
    transports: [
      {
        type: 'distribus'
      }
    ]
  });
  ```

- Create an agent:

  ```js
  var agent1 = new MyAgent('agent1');
  ```

### HelloAgent

To create a simple agent class, create a file [**HelloAgent.js**](examples/agents/HelloAgent.js) with the 
following code:

```js
var eve = require('evejs');

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

## Documentation

- [API](https://github.com/enmasseio/evejs/tree/master/docs/api.md)
- [Configuration](https://github.com/enmasseio/evejs/tree/master/docs/configuration.md)
- [Transports](https://github.com/enmasseio/evejs/tree/master/docs/transports.md)
- [Modules](https://github.com/enmasseio/evejs/tree/master/docs/modules.md)
- [Protocols](https://github.com/enmasseio/evejs/tree/master/docs/protocols.md)


## Examples

Examples are available in the examples folder:

[https://github.com/enmasseio/evejs/tree/master/examples](https://github.com/enmasseio/evejs/tree/master/examples)


## Build

To create a bundled file of `evejs` for use in the browser, use [browserify](http://browserify.org/):

    browserify index.js -o eve.js -s eve

This will generate a file *eve.js* which can be loaded into the browser. This bundle contains all supported modules, transports, and services.


## Custom builds

To create a custom bundle containing only the needed modules and transports, create a copy of *index.js* named *custom.js*, and strip all redundant dependencies for it. The most minimalistic version only includes `Agent` and `LocalTransport` and could look like:

```js
exports.Agent = require('./lib/Agent');
exports.transport: {
  LocalTransport: require('./lib/transport/local/LocalTransport')
}
```

Create a bundle using [browerify](http://browserify.org/):

    browserify custom.js -o eve.custom.js -s eve


## Test

To test `evejs`, install the project dependencies once:

    npm install

Then run the tests:

    npm test
