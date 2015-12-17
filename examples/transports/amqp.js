var Promise = require('promise');
var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

// Configure eve
// Example AMQP configurations:
//   {type: 'amqp', url: 'amqp://localhost'} or
//   {type: 'amqp', host: 'dev.rabbitmq.com'}
eve.system.init({
  transports: [
    {
      type: 'amqp',
      host: 'localhost'
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// once both agents are connected, send a message to agent1
Promise.all([agent1.ready, agent2.ready]).then(function () {
  agent2.send('agent1', 'Hello agent1!');
});
