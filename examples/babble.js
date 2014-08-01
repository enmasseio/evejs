/**
 * This example demonstrates how to extend an actor with babble.
 * Babble provides dynamic communication flows between message based actors.
 *
 * https://github.com/enmasseio/babble
 */

var actors = require('../index');
var babble = require('babble');

// create two actors and babblify them
var emma = babble.babblify(new actors.Actor('emma'));
var jack = babble.babblify(new actors.Actor('jack'));

// create a message bus and connect both actors
var bus = new actors.LocalMessageBus();
emma.connect(bus);
jack.connect(bus);

emma.listen('hi')
    .listen(printMessage)
    .decide(function (message, context) {
      return (message.indexOf('age') != -1) ? 'age' : 'name';
    }, {
      'name': babble.tell('hi, my name is emma'),
      'age':  babble.tell('hi, my age is 27')
    });

jack.tell('emma', 'hi')
    .tell(function (message, context) {
      if (Math.random() > 0.5) {
        return 'my name is jack'
      } else {
        return 'my age is 25';
      }
    })
    .listen(printMessage);

function printMessage (message, context) {
  console.log(context.from + ': ' + message);
  return message;
}
