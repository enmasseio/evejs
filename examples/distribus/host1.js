var distribus = require('distribus');
var eve = require('../../index');
var HelloAgent = require('../agents/HelloAgent');

// create a host
var host1 = new distribus.Host();

// start listening on a port
host1.listen('localhost', 3000)
    .then(function () {
      // configure eve
      eve.system.init({
        transports: [
          {
            type: 'distribus',
            host: host1
          }
        ]
      });

      // create an agent
      var agent1 = new HelloAgent('agent1');
    });
