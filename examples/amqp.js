var Promise = require('promise');
var eve = require('../index');

// example configuration: {url: 'amqp://localhost'} or {host: 'dev.rabbitmq.com'}
// var transport = new eve.transport.AMQPTransport({url: 'amqp://localhost'});
var transport = new eve.transport.AMQPTransport({host: 'dev.rabbitmq.com'});

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
var agent1 = new eve.Agent('agent1');
agent1.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
};

// agent 2 listens for any message
var agent2 = new eve.Agent('agent2');
agent2.receive = function (from, message) {
  console.log(from + ' said: ' + message);
};

// connect both agents to the AMQP transport
var connected1 = agent1.connect(transport);
var connected2 = agent2.connect(transport);

// once both are connected, send a message to agent 1
Promise.all([connected1, connected2])
    .then(function () {
      agent2.send('agent1', 'Hello agent1!');
    });
