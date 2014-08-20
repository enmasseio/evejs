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

var jack = new eve.Agent('jack');
jack.extend('request', {timeout: 10000});
jack.connect(services.transports.get());

var calcAgent = new CalcAgent('calcAgent', services);

// send a message to calcAgent
jack.request('calcAgent', {fn: 'add', a: 2, b: 4.1})
    .then(function (response) {
      console.log('response:', response);
    });

// send a wrong message to the calcAgent
jack.request('calcAgent', 'wrong input...')
    .then(function (response) {
      console.log('response:', response);
    })
    .catch(function (err) {
      console.log(err.toString());
    });
