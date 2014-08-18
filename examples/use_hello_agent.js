var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

// we don't provide a service manager to the agents,
// therefore they will use the default service manager.
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent 1
agent2.sayHi('agent1');
