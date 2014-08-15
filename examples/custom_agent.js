// This example shows how to extend an Agent
var eve = require('../index');

/**
 * Custom agent prototype
 * @param {String} id
 * @param {ServiceManager} manager
 * @constructor
 * @extend eve.Agent
 */
function MyAgent(id, manager) {
  // execute super constructor function
  eve.Agent.call(this, id);

  // listen for greetings
  this.on(/hi|hello/i, this.onGreeting.bind(this));

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
 * Handle incoming greetings
 * @param {String} from
 * @param {String} message
 */
MyAgent.prototype.onGreeting = function(from, message) {
  console.log(from + ' said: ' + message);
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
MyAgent.prototype.destroy = function() {
  this.disconnect();
};

var config = {
  transports: [
    {type: 'local'}
  ]
};
var manager = new eve.ServiceManager(config);

var agent1 = new MyAgent('agent1', manager);
var agent2 = new MyAgent('agent2', manager);

// send a message to agent 1
agent2.sayHi('agent1');

// Test prototype inheritance:
// console.log(agent1 instanceof MyAgent);    // true
// console.log(agent1 instanceof eve.Agent);  // true
// console.log(agent1.constructor.name);      // 'MyAgent'
