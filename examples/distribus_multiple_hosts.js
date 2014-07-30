var async = require('async');
var distribus = require('distribus');
var actors = require('../index');

var host1 = new distribus.Host();
var host2 = new distribus.Host();

host1.listen('localhost', 3000)
    .then(function () {
      return host2.listen('localhost', 3001);
    })
    .then(function () {
      return host1.join('ws://localhost:3001');
    })
    .then(function () {
      var bus1 = new actors.DistribusMessageBus({host: host1});
      var bus2 = new actors.DistribusMessageBus({host: host2});

      async.parallel({
        // create and connect actor1
        actor1: function (cb) {
          var actor1 = new actors.Actor('actor1');

          // actor 1 listens for messages containing 'hi' or 'hello' (case insensitive)
          actor1.on(/hi|hello/i, function (from, message) {
            console.log(from + ' said: ' + message);

            // reply to the greeting
            this.send(from, 'Hi ' + from + ', nice to meet you!');
          });

          actor1.connect(bus1, function () {
            cb(null, actor1)
          });
        },

        // create and connect actor2
        actor2: function (cb) {
          var actor2 = new actors.Actor('actor2');

          // actor 2 listens for any message
          actor2.on(/./, function (from, message) {
            console.log(from + ' said: ' + message);
          });

          actor2.connect(bus2, function () {
            cb(null, actor2)
          });
        }
      }, function (err, actors) {
        // send a message to actor 1
        actors.actor2.send('actor1', 'Hello actor1!');
      });

    });
