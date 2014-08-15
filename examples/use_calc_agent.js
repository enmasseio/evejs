var eve = require('../index');
var HelloAgent = require('./agents/HelloAgent');
var CalcAgent = require('./agents/CalcAgent');

var config = {
  transports: [
    {
      type: 'distribus'
    }
  ]
};
var services = new eve.ServiceManager(config);

var jack = new HelloAgent('jack', services);
var calc = new CalcAgent('calc', services);

// send a message to agent 1
jack.send('calc', {id: 1, fn: 'add', a: 2, b: 4.1});
