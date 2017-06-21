var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

eve.system.init({
  transports: [
    {
      type: 'dbus',
      url: 'dbus:com.almende.eve/com/almende/eve/agent/:id',
      remoteUrl: 'dbus:com.almende.eve/com/almende/eve/agent/:id',
      localShortcut: false,
      default: true
    }
  ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

setTimeout(function () {

  // send a message to agent1
  agent1.sayHello('dbus:com.almende.eve/com/almende/eve/agent/agent2');

// alternative:
  agent2.sayHello('agent1'); // this works because of the remoteUrl of the transport.

// catch error
//    agent2.send("agent3", "Hello").catch(function (err) {
//      console.log(err)
//    });

}, 500);


