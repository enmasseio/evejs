var eve = require('../../index');

function RequestAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with support for requests
  this.extend('request');

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RequestAgent.prototype = Object.create(eve.Agent.prototype);
RequestAgent.prototype.constructor = RequestAgent;

// implement the receive method
RequestAgent.prototype.receive = function (from, message) {
  console.log(from + ' said: ' + message);

  // return value is send back as reply in case of a request
  return 'Hi ' + from + ', nice to meet you!';
};

module.exports = RequestAgent;
