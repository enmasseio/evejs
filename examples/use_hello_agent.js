var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent 1
agent2.sayHi('agent1');
