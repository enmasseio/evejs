var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

// load config from a file
var config = require('./config.json');
eve.system.init(config);

var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent1
agent2.sayHello('agent1');
