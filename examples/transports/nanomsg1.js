var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

eve.system.init({
  transports: [
    {
      type: 'nanomsg',
      port: 3030,
      interface: "127.0.0.1",
      //url: 'nanomsg:tcp://127.0.0.1:3030',
      localShortcut: false,
      default: true,
      socketConfig:{"ipv6":false}
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');

setTimeout(function () {
  Promise.all([agent1.ready]).then(function () {
    // send a message to agent1
    agent1.sayHello('nanomsg:tcp://127.0.0.1:3031');

  }, function (err) {
    console.log("Agents rejected getting ready.", err);
  });
}, 2000);



