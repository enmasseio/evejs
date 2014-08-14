var Promise = require('promise');
var eve = require('../index');

var transport = new eve.PubNubTransport({
  publish_key: 'demo',    // REPLACE THIS WITH YOUR PUBNUB PUBLISH KEY
  subscribe_key: 'demo'   // REPLACE THIS WITH YOUR PUBNUB SUBSCRIBE KEY
});

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
var connected1 = agent1.connect(transport);
var connected2 = agent2.connect(transport);

// once both are connected, send a message to agent 1
Promise.all([connected1, connected2])
    .then(function () {
      agent2.send('agent1', 'Hello agent1!');
    });
