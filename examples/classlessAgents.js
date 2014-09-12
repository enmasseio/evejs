// While generally recommended, it's not necessary to create agent classes
// nor to use `eve.system` to configure and load transports and other services.
// It is possible to just use the base eve Agent and instantiate transports
// manually.
var eve = require('../index');

// create agent1
// extend the agent with pattern listening functionality,
// and listen for messages containing 'hi' or 'hello' (case insensitive)
var agent1 = new eve.Agent('agent1');
agent1.extend('pattern');
agent1.listen(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// create agent2
// this agent just listens for any message
var agent2 = new eve.Agent('agent2');
agent2.receive = function (from, message) {
  console.log(from + ' said: ' + message);
};

// create a transport and connect both agents
var transport = new eve.transport.LocalTransport();
agent1.connect(transport);
agent2.connect(transport);

// send a message to agent1
agent2.send('agent1', 'Hello agent1!');
