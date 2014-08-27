var eve = require('../index');

// create two agents. A LocalAgent automatically connects to a LocalTransport
var agent1 = new eve.LocalAgent('agent1');
var agent2 = new eve.LocalAgent('agent2');

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
agent1.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
};

// agent 2 listens for any message
agent2.receive = function (from, message) {
  console.log(from + ' said: ' + message);
};

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
