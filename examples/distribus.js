var Promise = require('promise');
var eve = require('../index');

eve.system.init({
  transports: [
    {
      type: 'distribus'
    }
  ]
});


// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
var agent1 = new eve.Agent('agent1');
agent1.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
};

// agent 2 listens for any message
var agent2 = new eve.Agent('agent2');
agent2.receive = function (from, message) {
  console.log(from + ' said: ' + message);
};

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
