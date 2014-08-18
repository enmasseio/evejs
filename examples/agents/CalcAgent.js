var eve = require('../../index');

/**
 * CalcAgent can evaluate expressions
 * @param {String} id
 * @param {ServiceManager} [services]
 * @constructor
 * @extend eve.Agent
 */
function CalcAgent(id, services) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports provided by the service manager
  // fall back to the default service manager when not provided
  services = services || eve.defaultServiceManager;
  this.connect(services.transports.get());
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
CalcAgent.prototype.onMessage = function(from, message) {
  if ('fn' in message && 'a' in message && 'b' in message) {
    switch(message.fn) {
      case 'add':
        this.send(from, {
          id: message.id,
          result: message.a + message.b
        });
        break;

      case 'subtract':
        this.send(from, {
          id: message.id,
          result: message.a - message.b
        });
        break;

      case 'multiply':
        this.send(from, {
          id: message.id,
          result: message.a * message.b
        });
        break;

      case 'divide':
        this.send(from, {
          id: message.id,
          result: message.a / message.b
        });
        break;

      default:
        this.send(from, {
          id: message.id,
          error: 'Unknown function "' + message.fn + '"'
        });
        break;
    }
  }
  else {
    this.send(from, {
      id: message.id,
      error: 'Object expected with properties fn, a, and b'
    });
  }
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
CalcAgent.prototype.destroy = function() {
  this.disconnect();
};

module.exports = CalcAgent;
