var eve = require('../../index');

function PatternAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with pattern listening functionality
  this.extend('pattern');
  // alternatively, the pattern module can be loaded in a separate namespace
  // instead of extending the agent itself:
  //   this.pattern = this.loadModule('pattern');
  //   this.pattern.listen(...)

  // listen for messages containing 'hello' (case insensitive)
  this.listen(/hello/i, function (from, message) {
    // reply to the greeting
    this.send(from, 'Hi ' + from + ', nice to meet you!');
  });

  // listen for any message
  this.listen(/./, function (from, message) {
    console.log(from + ' said: ' + message);
  });

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
PatternAgent.prototype = Object.create(eve.Agent.prototype);
PatternAgent.prototype.constructor = PatternAgent;

module.exports = PatternAgent;
