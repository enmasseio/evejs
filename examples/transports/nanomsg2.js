var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

eve.system.init({
  transports: [
    {
      type: 'nanomsg',
      url: 'nanomsg:tcp://127.0.0.1:3031',
      localShortcut: false,
      default: true,
      socketConfig:{"ipv6":false}
    }
  ]
});

// create two agents
var agent2 = new HelloAgent('agent2');

setTimeout(function () {
  Promise.all([agent2.ready]).then(function () {
    // send a message to agent1
    agent2.sayHello('nanomsg:tcp://localhost:3030');

  }, function (err) {
    console.log("Agents rejected getting ready.", err);
  });
}, 2000);



