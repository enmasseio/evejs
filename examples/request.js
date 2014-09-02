var RequestAgent = require('./agents/RequestAgent');

// create two agents
var agent1 = new RequestAgent('agent1');
var agent2 = new RequestAgent('agent2');

// send a request to agent 1, await the response
agent2.request('agent1', 'Hello agent1!')
    .then(function(reply) {
      console.log('reply: ' + reply);
    });
