var eve = require('../../index');

/**
 * Custom agent prototype
 * @param {String} id
 * @param {ServiceManager} [services]
 * @constructor
 * @extend eve.Agent
 */
function HelloAgent(id, services) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports provided by the service manager
  // fall back to the default service manager when not provided
  services = services || eve.defaultServiceManager;
  this.connect(services.transports.get());
}

// extend the eve.Agent prototype
HelloAgent.prototype = Object.create(eve.Agent.prototype);
HelloAgent.prototype.constructor = HelloAgent;

/**
 * Send a greeting to an agent
 * @param {String} to
 */
HelloAgent.prototype.sayHi = function(to) {
  this.send(to, 'Hi!');
};

/**
 * Handle incoming greetings. This overloads the default onMessage,
 * so we can't use HelloAgent.on(pattern, listener) anymore
 * @param {String} from     Id of the sender
 * @param {*} message       Received message, a JSON object (often a string)
 */
HelloAgent.prototype.onMessage = function(from, message) {
  console.log(from + ' said: ' + JSON.stringify(message));
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
HelloAgent.prototype.destroy = function() {
  this.disconnect();
};

// Test prototype inheritance:
// console.log(agent1 instanceof HelloAgent);    // true
// console.log(agent1 instanceof eve.Agent);  // true
// console.log(agent1.constructor.name);      // 'HelloAgent'

module.exports = HelloAgent;
