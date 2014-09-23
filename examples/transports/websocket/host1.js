var eve = require('../../../index');
var HelloAgent = require('../../agents/HelloAgent');

// configure eve
eve.system.init({
  transports: [
    {
      type: 'ws',
      url: 'ws://localhost:3000/agents/:id'
    }
  ]
});

// create an agent
var agent1 = new HelloAgent('agent1');
