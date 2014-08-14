// This example shows how to extend an Agent
var eve = require('../index');

/**
 * Custom agent prototype
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function MyAgent(id) {
  // execute super constructor function
  eve.Agent.call(this, id);

  // listen for greetings
  this.on(/hi|hello/i, this.onGreeting.bind(this));
}

// extend the eve.Agent prototype
MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

/**
 * Send a greeting to an agent
 * @param {String} to
 */
MyAgent.prototype.sayHi = function (to) {
  this.send(to, 'Hi!');
};

/**
 * Handle incoming greetings
 * @param {String} from
 * @param {String} message
 */
MyAgent.prototype.onGreeting = function (from, message) {
  console.log(from + ' said: ' + message);
};

var transport = new eve.LocalTransport();
var agent1 = new MyAgent('agent1');
var agent2 = new MyAgent('agent2');

// connect both agents to the transport
agent1.connect(transport);
agent2.connect(transport);

// send a message to agent 1
agent2.sayHi('agent1');

// Test prototype inheritance:
// console.log(agent1 instanceof MyAgent);    // true
// console.log(agent1 instanceof eve.Agent);  // true
// console.log(agent1.constructor.name);      // 'MyAgent'
