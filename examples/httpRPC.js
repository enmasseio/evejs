var eve = require('../index');
var RPCAgent = require('./agents/RPCAgent');

eve.system.init({
  transports: [
    {
      type: 'http',
      port: 3000,
      url: 'http://127.0.0.1:3000/agents/:id',
      remoteUrl: 'http://127.0.0.1:3000/agents/:id',
      localShortcut: false,
      'default': true
    }
  ]
});

// create two agents
var agent1 = new RPCAgent('agent1');
var agent2 = new RPCAgent('agent2');

// send a message to agent1
agent2.askToAdd('http://127.0.0.1:3000/agents/agent1', {a:1, b:2});
