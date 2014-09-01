var eve = require('../../index');

function PatternAgent2(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // load the pattern module in a separate namespace (instead of extending
  // the agent itself)
  this.pattern = this.loadModule('pattern');

  // listen for messages containing 'hello' (case insensitive)
  this.pattern.listen(/hello/i, function (from, message) {
    // reply to the greeting
    this.send(from, 'Hi ' + from + ', nice to meet you!');
  });

  // listen for any message
  this.pattern.listen(/./, function (from, message) {
    console.log(from + ' said: ' + message);
  });

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
PatternAgent2.prototype = Object.create(eve.Agent.prototype);
PatternAgent2.prototype.constructor = PatternAgent2;

module.exports = PatternAgent2;
