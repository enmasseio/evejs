var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

var config = {
  transports: [
    {
      type: 'local'
    }
  ]
};
var services = new eve.ServiceManager(config);

var agent1 = new HelloAgent('agent1', services);
var agent2 = new HelloAgent('agent2', services);

// send a message to agent 1
agent2.sayHi('agent1');
