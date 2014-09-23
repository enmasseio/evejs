# evejs

Simple message based agents. This is the JavaScript version of [Eve](http://eve.almende.com), the web based agent platform.


## Install

Install the module via npm:

    npm install evejs


## Use

An agent basically has a methods `send`, `receive`, `connect` and `disconnect`.
An agent can be extended with modules like `pattern` and `request`. There is
a central configuration `eve.system` which can be used to load transports. 
The loaded transports can be used by agents to communicate with each other.

To set up a system with eve agents:

- Create an agent class extending `eve.Agent`. A template for a custom agent is:

  ```js
  var eve = require('evejs');
  
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
  eve.system.load({
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

- Connect an agent to one or multiple transports. This is typically done in
  the agents constructor function:
  
  ```js
  agent1.connect(eve.system.transports.getAll());
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
- [Transports](https://github.com/enmasseio/evejs/tree/master/docs/modules.md)
- [Modules](https://github.com/enmasseio/evejs/tree/master/docs/prootocols.md)
- [Protocols](https://github.com/enmasseio/evejs/tree/master/docs/transports.md)


## Examples

Examples are available in the examples folder:

[https://github.com/enmasseio/evejs/tree/master/examples](https://github.com/enmasseio/evejs/tree/master/examples)


## Test

To test `evejs`, install the project dependencies once:

    npm install

Then run the tests:

    npm test
