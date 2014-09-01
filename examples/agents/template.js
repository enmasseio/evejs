// This is a template for extending the base eve Agent prototype
var eve = require('../../index');

function MyAgent(id) {
  eve.Agent.call(this, id);

  // ...
}

MyAgent.prototype = Object.create(eve.Agent.prototype);
MyAgent.prototype.constructor = MyAgent;

MyAgent.prototype.receive = function (from, message) {
  // ...
};

module.exports = MyAgent;
