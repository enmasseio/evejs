var distribus = require('distribus');
var actors = require('../index');

var host1 = new distribus.Host();
var host2 = new distribus.Host();

// create two buses: one connected to host1, the other to host2
var bus1 = new actors.DistribusMessageBus({host: host1});
var bus2 = new actors.DistribusMessageBus({host: host2});

var actor1;
var actor2;

host1.listen('localhost', 3000)

    .then(function () {
      return host2.listen('localhost', 3001);
    })

    .then(function () {
      return host1.join('ws://localhost:3001');
    })

    .then(function () {
      // actor 1 listens for messages containing 'hi' or 'hello' (case insensitive)
      actor1 = new actors.Actor('actor1');
      actor1.on(/hi|hello/i, function (from, message) {
        console.log(from + ' said: ' + message);

        // reply to the greeting
        this.send(from, 'Hi ' + from + ', nice to meet you!');
      });

      // connect the actor to bus1
      return actor1.connect(bus1);
    })

    .then(function () {
      // actor 2 listens for any message
      actor2 = new actors.Actor('actor2');
      actor2.on(/./, function (from, message) {
        console.log(from + ' said: ' + message);
      });

      // connect the actor to bus2
      return actor2.connect(bus2);
    })

    .then(function () {
      // once both are connected, send a message to actor 1
      actor2.send('actor1', 'Hello actor1!');
    });
