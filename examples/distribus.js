var Promise = require('promise');
var actors = require('../index');

var bus = new actors.DistribusMessageBus();

// actor 1 listens for messages containing 'hi' or 'hello' (case insensitive)
var actor1 = new actors.Actor('actor1');
actor1.on(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// actor 2 listens for any message
var actor2 = new actors.Actor('actor2');
actor2.on(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// connect both actors to the message bus
actor1.connect(bus);
actor2.connect(bus);

// send a message to actor 1
actor2.send('actor1', 'Hello actor1!');
