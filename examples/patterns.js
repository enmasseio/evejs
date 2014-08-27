var eve = require('../index');

// create two agents and extend them with pattern listening functionality
var agent1 = new eve.LocalAgent('agent1').extend('pattern');
var agent2 = new eve.LocalAgent('agent2').extend('pattern');

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
agent1.listen(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// agent 2 listens for any message
agent2.listen(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
