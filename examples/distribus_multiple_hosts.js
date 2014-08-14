var distribus = require('distribus');
var eve = require('../index');

var host1 = new distribus.Host();
var host2 = new distribus.Host();

// create two transports: one connected to host1, the other to host2
var transport1 = new eve.transport.DistribusTransport({host: host1});
var transport2 = new eve.transport.DistribusTransport({host: host2});

var agent1;
var agent2;

host1.listen('localhost', 3000)

    .then(function () {
      return host2.listen('localhost', 3001);
    })

    .then(function () {
      return host1.join('ws://localhost:3001');
    })

    .then(function () {
      // agent 1 listens for messages containing 'hi' or 'hello' (case insensitive)
      agent1 = new eve.Agent('agent1');
      agent1.on(/hi|hello/i, function (from, message) {
        console.log(from + ' said: ' + message);

        // reply to the greeting
        this.send(from, 'Hi ' + from + ', nice to meet you!');
      });

      // connect the agent to transport1
      return agent1.connect(transport1);
    })

    .then(function () {
      // agent 2 listens for any message
      agent2 = new eve.Agent('agent2');
      agent2.on(/./, function (from, message) {
        console.log(from + ' said: ' + message);
      });

      // connect the agent to transport2
      return agent2.connect(transport2);
    })

    .then(function () {
      // once both are connected, send a message to agent 1
      agent2.send('agent1', 'Hello agent1!');
    });
