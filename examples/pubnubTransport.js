var Promise = require('promise');
var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

// Configure eve, load a pubnub transport
eve.system.init({
  transports: [
    {
      type: 'pubnub',
      publish_key: 'demo',    // REPLACE THIS WITH YOUR PUBNUB PUBLISH KEY
      subscribe_key: 'demo'   // REPLACE THIS WITH YOUR PUBNUB SUBSCRIBE KEY
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// once both agents are connected, send a message to agent1
Promise.all([agent1.ready, agent2.ready]).then(function () {
  agent2.send('agent1', 'Hello agent1!');
});
