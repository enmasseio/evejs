var Promise = require('promise');
var eve = require('../index');

var transport = new eve.DistribusTransport();

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
var agent1 = new eve.Agent('agent1');
agent1.on(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// agent 2 listens for any message
var agent2 = new eve.Agent('agent2');
agent2.on(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// connect both agents to the transport
agent1.connect(transport);
agent2.connect(transport);

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
