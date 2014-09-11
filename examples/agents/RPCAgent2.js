var eve = require('../../index');

function RPCAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  this.extend('rpc',this.rpcFunctions);


  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RPCAgent.prototype = Object.create(eve.Agent.prototype);
RPCAgent.prototype.constructor = RPCAgent;
RPCAgent.prototype.rpcFunctions = {};
RPCAgent.prototype.rpcFunctions.add = function(params, from) {
  return params.a + params.b;
}

RPCAgent.prototype.add = function(params, from) {
  return params.a + params.b;
}

RPCAgent.prototype.askToAdd = function(to, params) {
  var message = {method:"add", params:params};
  this.request(to, message).then(function(reply) {
    console.log("The agent told me that",params.a, "+",params.b,"=",reply.result);
  });
}

module.exports = RPCAgent;
