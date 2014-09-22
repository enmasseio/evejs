var CalcAgent = require('./agents/CalcAgent');
var RequestAgent = require('./agents/RequestAgent');

var jack = new RequestAgent('jack');
var calc = new CalcAgent('calc');

// send a request to the calc agent
jack.request('calc', {fn: 'add', a: 2, b: 4.1})
    .then(function (response) {
      console.log('response:', response);
    });

// send a wrong message to the calc agent
jack.request('calc', 'wrong input...')
    .then(function (response) {
      console.log('response:', response);
    })
    .catch(function (err) {
      console.log('We should receive an error because of wrong input: ');
      console.log('  ', err.toString());
    });
