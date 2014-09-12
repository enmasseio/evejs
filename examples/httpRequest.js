var eve = require('../index');
var RequestAgent = require('./agents/RequestAgent');


eve.system.init({
  transports: [
    {
      type: 'http',
      url: 'http://127.0.0.1:3000/agents/:id',
      remoteUrl: 'http://127.0.0.1:3000/agents/:id',
      localShortcut: false,
      'default': true
    }
  ]
});

// create two agents
var agent1 = new RequestAgent('agent1');
var agent2 = new RequestAgent('agent2');

// send a request to agent 1, await the response
agent2.request('agent1', 'Hello agent1!')
    .then(function(reply) {
      console.log('reply: ' + reply);
    });
