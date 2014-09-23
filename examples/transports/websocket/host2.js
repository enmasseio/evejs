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
var agent2 = new HelloAgent('agent2');

agent2.sayHello('ws://localhost:3000/agents/agent1');

// Note: it is possible to open a WebSocket connection to an agent without
// sending a message using the connect function:
//
//    agent2.connections[0].connect('ws://localhost:3000/agents/agent1');
//
