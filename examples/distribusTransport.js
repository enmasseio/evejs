var Promise = require('promise');
var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

// Configure eve, load a distribus transport
eve.system.init({
  transports: [
    {
      type: 'distribus'
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
