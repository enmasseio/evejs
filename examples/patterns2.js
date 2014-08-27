var eve = require('../index');

// create two agents and extend them with pattern listening functionality
var agent1 = new eve.LocalAgent('agent1');
var agent2 = new eve.LocalAgent('agent2');

// with function extendTo, we can put the module in a separate namespace
// instead of having it merged with the agent itself.
agent1.pattern = agent1.extendTo('pattern');
agent2.pattern = agent2.extendTo('pattern');

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
agent1.pattern.listen(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// agent 2 listens for any message
agent2.pattern.listen(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
