var async = require('async'),
    actors = require('../index');

var bus = new actors.PubNubMessageBus({
      publish_key: 'demo',    // REPLACE THIS WITH YOUR PUBNUB PUBLISH KEY
      subscribe_key: 'demo'   // REPLACE THIS WITH YOUR PUBNUB SUBSCRIBE KEY
    }),
    actor2 = new actors.Actor('actor2');

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

    actor1.connect(bus, function () {
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

    actor2.connect(bus, function () {
      cb(null, actor2)
    });
  }
}, function (err, actors) {
  // send a message to actor 1
  actors.actor2.send('actor1', 'Hello actor1!');

  actors.actor1.disconnect();
  actors.actor2.disconnect();
});
