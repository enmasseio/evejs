var distribus = require('distribus');
var eve = require('../../../index');
var HelloAgent = require('../../agents/HelloAgent');

// create a host
var host2 = new distribus.Host();

// start listening on a port
host2.listen('localhost', 3001)
    .then(function () {
      // join host1 (script host1.js must be running!)
      return host2.join('ws://localhost:3000');
    })
    .then(function () {
      // configure eve
      eve.system.init({
        transports: [
          {
            type: 'distribus',
            host: host2
          }
        ]
      });

      // create an agent
      var agent2 = new HelloAgent('agent2');

      // send a message to agent1
      agent2.send('agent1', 'Hello agent1!');
    });
