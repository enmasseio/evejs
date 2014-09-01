var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent1
agent2.send('agent1', 'Hello agent1!');
