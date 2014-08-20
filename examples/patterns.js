var eve = require('../index');

// create two agents and extend them with pattern listening functionality
var agent1 = new eve.Agent('agent1').extend('pattern');
var agent2 = new eve.Agent('agent2').extend('pattern');

// create a transport and connect both agents
var transport = new eve.transport.LocalTransport();
agent1.connect(transport);
agent2.connect(transport);

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
agent1.listen(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// agent 2 listens for any message
agent2.listen(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
