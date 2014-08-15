// This example shows how to extend Agent
var eve = require('../../index');

/**
 * Custom agent prototype
 * @param {String} id
 * @param {ServiceManager} manager
 * @constructor
 * @extend eve.Agent
 */
function MyAgent(id, manager) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports provided by the service manager
  this.connect(manager.getTransports());
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

/**
 * Send a greeting to an agent
 * @param {String} to
 */
MyAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

/**
 * Handle incoming greetings. This overloads the default onMessage,
 * so we can't use MyAgent.on(pattern, listener) anymore
 * @param {String} from
 * @param {String} message
 */
MyAgent.prototype.onMessage = function(from, message) {
  console.log(from + ' said: ' + message);
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
MyAgent.prototype.destroy = function() {
  this.disconnect();
};

module.exports = MyAgent;
