var Promise = require('promise');
var actors = require('../index');

// example configuration: {url: 'amqp://localhost'} or {host: 'dev.rabbitmq.com'}
//var transport = new actors.AMQPTransport({url: 'amqp://localhost'});
var transport = new actors.AMQPTransport({host: 'dev.rabbitmq.com'});

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

// connect both actors to the AMQP transport
var connected1 = actor1.connect(transport);
var connected2 = actor2.connect(transport);

// once both are connected, send a message to actor 1
Promise.all([connected1, connected2])
    .then(function () {
      actor2.send('actor1', 'Hello actor1!');
    });
