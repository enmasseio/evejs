var PatternAgent = require('./agents/PatternAgent');

// create two agents
var agent1 = new PatternAgent('agent1');
var agent2 = new PatternAgent('agent2');

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
