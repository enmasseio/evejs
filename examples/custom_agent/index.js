var eve = require('../../index');
var MyAgent = require('./MyAgent');

var config = {
  transports: [
    {type: 'local'}
  ]
};
var manager = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', manager);
var agent2 = new MyAgent('agent2', manager);

// send a message to agent 1
agent2.sayHi('agent1');

// Test prototype inheritance:
// console.log(agent1 instanceof MyAgent);    // true
// console.log(agent1 instanceof eve.Agent);  // true
// console.log(agent1.constructor.name);      // 'MyAgent'
