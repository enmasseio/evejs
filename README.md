# actors

Simple message based actors

The actors send messages to each other via a message bus, and they can listen
for message patterns.


## Install

TODO: publish the library on npm


## Use

Example usage:

```js
var actors = require('../index');

var bus = new actors.LocalMessageBus();
    actor1 = new actors.Actor('actor1');
    actor2 = new actors.Actor('actor2');

actor1.connect(bus);
actor2.connect(bus);

// actor1 listens for messages containing 'hi' or 'hello' (case insensitive)
actor1.on(/hi|hello/i, function (from, message) {
  console.log(from + ' said: ' + message);

  // reply to the greeting
  this.send(from, 'Hi ' + from + ', nice to meet you!');
});

// actor2 listens for any message
actor2.on(/./, function (from, message) {
  console.log(from + ' said: ' + message);
});

// send a message to actor 1
actor2.send('actor1', 'Hello actor1!');
```

## Test

First install the project dependencies:

    npm install

Then run the tests:

    npm test
