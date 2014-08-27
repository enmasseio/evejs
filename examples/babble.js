/**
 * This example demonstrates how to extend an agent with babble.
 * Babble provides dynamic communication flows between message based agents.
 *
 * https://github.com/enmasseio/babble
 */

var eve = require('../index');
var babble = require('babble');

// create two agents and babblify them
var emma = new eve.LocalAgent('emma').extend('babble');
var jack = new eve.LocalAgent('jack').extend('babble');

emma.listen('hi')
    .listen(function (message, context) {
      console.log(context.from + ': ' + message);
      return message;
    })
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
    .listen(function (message, context) {
      console.log(context.from + ': ' + message);
    });
