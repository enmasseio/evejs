var Agent = require('./Agent');
var system = require('./system');

/**
 * A LocalAgent is an Agent which automatically connects to the local transport
 * configured in the system.
 * @param {String} id
 * @constructor
 * @extends Agent
 */
function LocalAgent(id) {
  // execute super constructor
  Agent.call(this, id);

  // connect to all local transports provided by the system
  this.connect(system.transports.getByType('local'));
}

// extend the eve.Agent prototype
LocalAgent.prototype = Object.create(Agent.prototype);
LocalAgent.prototype.constructor = LocalAgent;

module.exports = LocalAgent;
