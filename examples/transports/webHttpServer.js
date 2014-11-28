var eve = require('../../index');
var HelloAgent = require('./../agents/HelloAgent');

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

function testAgent(id) {
  eve.Agent.call(this, id);
  this.rpc = this.loadModule('rpc', this.rpcFunctions);
  this.connect(eve.system.transports.getAll());
}
testAgent.prototype = Object.create(eve.Agent.prototype);
testAgent.prototype.constructor = testAgent;
testAgent.prototype.rpcFunctions = {};
testAgent.prototype.rpcFunctions.add = function (params, sender) {
  console.log("received a request from", sender, "to add",params);
  return params.a + params.b;
};

var agent = new testAgent('agent1');