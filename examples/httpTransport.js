var Promise = require('promise');
var eve = require('../index');

eve.system.init({
  transports: [
    {
      type: 'http',
      port:3000,
      url:"http://127.0.0.1:3000/agents/:id",
      remoteUrl: "http://127.0.0.1:3000/agents/:id",
      localShortcut:false,
      default:true
    }
  ]
});

// agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
var agent1 = new eve.Agent('agent1');
var agent2 = new eve.Agent('agent2');
agent1.receive = function (from, message) {
  console.log(from + ' said: ' + message);
};

// Connect to all configured transports
agent1.connect(eve.system.transports.get());
agent2.connect(eve.system.transports.get());

// send a message to agent 1
agent2.send('agent1', 'Hello agent1!');
