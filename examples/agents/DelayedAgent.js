var eve = require('../../index');

/**
 * DelayedAgent prototype.
 * This agent uses the eve.system.timer. This timer can be configured to run
 * in real time, discrete time, or hyper time.
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function PlanningAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
PlanningAgent.prototype = Object.create(eve.Agent.prototype);
PlanningAgent.prototype.constructor = PlanningAgent;

/**
 * Send a greeting to an agent
 * @param {String} to
 * @param {number} delay   Delay in milliseconds
 */
PlanningAgent.prototype.sayDelayedHello = function(to, delay) {
  var time = eve.system.timer.getTime();
  console.log(time.toISOString(), this.id, 'planned saying hello with delay of', delay, 'ms');

  var me = this;
  eve.system.timer.setTimeout(function () {
    me.send(to, 'Hello ' + to + '!').catch(function (err) {
      console.log(err)
    })
  }, delay)
};

/**
 * Handle incoming greetings. This overloads the default receive,
 * so we can't use HelloAgent.on(pattern, listener) anymore
 * @param {String} from     Id of the sender
 * @param {*} message       Received message, a JSON object (often a string)
 */
PlanningAgent.prototype.receive = function(from, message) {
  var time = eve.system.timer.getTime();
  console.log(time.toISOString(), from, 'said:', JSON.stringify(message));
};

module.exports = PlanningAgent;
