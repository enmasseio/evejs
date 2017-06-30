var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

eve.system.init({
  transports: [
    {
      type: 'dbus',
      url: 'dbus:com.almende.eve/agent/:id',
      localShortcut: false,
      default: true,
      systembus: false
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

Promise.all([agent1.ready, agent2.ready]).then(function () {
  // send a message to agent1
  agent1.sayHello('dbus:com.almende.eve/agent/agent2');

  // alternative:
  agent2.sayHello('agent1'); // this works because of the remoteUrl of the transport.

  // catch error
  //   agent2.send("agent3", "Hello").catch(function (err) {
  //     console.log(err)
  // });
}, function(){
  console.log("Agents rejected getting ready.");
});



