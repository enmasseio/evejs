var eve = require('../../index');

function RPCAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', {add: this.rpcFunctions.add});
  // other ways to load the RPC module:
  // this.rpc = this.loadModule('rpc', this.rpcFunctions);
  // this.rpc = this.loadModule('rpc', {add: this.add});
  // this.rpc = this.loadModule('rpc', ['add']);

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RPCAgent.prototype = Object.create(eve.Agent.prototype);
RPCAgent.prototype.constructor = RPCAgent;

RPCAgent.prototype.add = function(params, from) {
  return params.a + params.b;
};

RPCAgent.prototype.askToAdd = function(to, params) {
  var message = {method:'add', params: params};
  this.rpc.request(to, message).then(function(reply) {
    console.log('The agent told me that',params.a, '+',params.b,'=',reply.result);
  });
};

// create functions available for RPC
RPCAgent.prototype.rpcFunctions = {};
RPCAgent.prototype.rpcFunctions.add = RPCAgent.prototype.add;

module.exports = RPCAgent;
