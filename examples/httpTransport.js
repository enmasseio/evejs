var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');

eve.system.init({
  transports: [
    {
      type: 'http',
      port: 3000,
      url: 'http://127.0.0.1:3000/agents/:id',
      remoteUrl: 'http://127.0.0.1:3000/agents/:id',
      localShortcut: false,
      default: true
    }
   ]
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

// send a message to agent1
agent2.sayHello('http://127.0.0.1:3000/agents/agent1');

// alternative:
agent2.sayHello('agent1'); // this works because of the remoteUrl of the transport.

// catch error
agent2.send("agent3", "Hello").catch(function (err) {
  console.log(err)
});