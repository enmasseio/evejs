var eve = require('../../../index');
var HelloAgent = require('../../agents/HelloAgent');

// configure eve
eve.system.init({
  transports: [
    {
      type: 'ws',
      url: 'ws://localhost:3001/agents/:id'
    }
  ]
});

// create an agent
var agent1 = new HelloAgent('agent2');

agent1.sayHello('ws://localhost:3000/agents/agent1');