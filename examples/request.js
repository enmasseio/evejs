var eve = require('../index');

// create two agents
var agent1 = new eve.LocalAgent('agent1').extend('request');
var agent2 = new eve.LocalAgent('agent2').extend('request');

// overload the receive message of agent1
agent1.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  return 'Hi ' + from + ', nice to meet you!';
};

// send a request to agent 1, await the response
agent2.request('agent1', 'Hello agent1!')
    .then(function(reply) {
      console.log('reply: ' + reply);
    });
