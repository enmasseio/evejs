var eve = require('../../index');
var DelayedAgent = require('../agents/DelayedAgent');

// configure the timer to run in discrete time
eve.system.init({
  transports: [
    {
      type: 'local'
    }
  ],
  timer: {
    rate: 'discrete',
    deterministic: true
  }
});

// set initial time for the simulation
eve.system.timer.setTime(new Date('2014-01-01T12:00:00Z'));

var agent1 = new DelayedAgent('agent1');
var agent2 = new DelayedAgent('agent2');

var delay = 2 * 24 * 60 * 60 * 1000; // two days
agent2.sayDelayedHello('agent1', delay);

// console output will (immediately) be:
// 2014-01-01T12:00:00.000Z agent2 planned saying hello with delay of 172800000 ms
// 2014-01-03T12:00:00.000Z agent2 said: "Hello agent1!"
