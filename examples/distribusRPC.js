var Promise = require('promise');
var eve = require('../index');
var RPCAgent2 = require('./agents/RPCAgent2');

// Configure eve, load a distribus transport
eve.system.init({
  transports: [
    {
      type: 'distribus'
    }
  ]
});

// create two agents
var agent1 = new RPCAgent2('agent1');
var agent2 = new RPCAgent2('agent2');

// send a message to agent 1
agent2.askToAdd('agent1',{a:1,b:2});
