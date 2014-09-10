var Promise = require('promise');
var eve = require('../index');
var RPCAgent = require('./agents/RPCAgent');

// Configure eve, load a distribus transport
eve.system.init({
  transports: [
    {
      type: 'distribus'
    }
  ]
});

// create two agents
var agent1 = new RPCAgent('agent1');
var agent2 = new RPCAgent('agent2');

// send a message to agent 1
agent2.askToAdd('agent1',{a:1,b:2});
