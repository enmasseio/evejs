var eve = require('../../index');

/**
 * CalcAgent can evaluate expressions
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function CalcAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with support for requests
  this.extend('request');

  // connect to all transports provided by the system
  this.connect(eve.system.transports.get());
}

// extend the eve.Agent prototype
CalcAgent.prototype = Object.create(eve.Agent.prototype);
CalcAgent.prototype.constructor = CalcAgent;

/**
 * Handle incoming messages.
 * Expects messages to be an object with properties fn, a, and b.
 * Available functions: 'add', 'subtract', 'multiply', 'divide'.
 * @param {String} from
 * @param {{fn: string, a: number, b: number, id: string}} message
 */
CalcAgent.prototype.receive = function(from, message) {
  if (typeof message === 'object' && 'fn' in message && 'a' in message && 'b' in message) {
    switch(message.fn) {
      case 'add':       return message.a + message.b;
      case 'subtract':  return message.a - message.b;
      case 'multiply':  return message.a * message.b;
      case 'divide':    return message.a / message.b;
      default:
        throw new Error('Unknown function "' + message.fn + '"');
    }
  }
  else {
    throw new Error('Object expected with properties fn, a, and b');
  }
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
CalcAgent.prototype.destroy = function() {
  this.disconnect();
};

module.exports = CalcAgent;
