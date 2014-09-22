var eve = require('../../index');

function RPCAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', {add: this.rpcFunctions.add}); // option 1
  // alternative ways to load the RPC module:
  // this.rpc = this.loadModule('rpc', this.rpcFunctions);      // option 2
  // this.rpc = this.loadModule('rpc', {minus: this.minus});    // option 3
  // this.rpc = this.loadModule('rpc', ['minus']);              // option 4

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
RPCAgent.prototype = Object.create(eve.Agent.prototype);
RPCAgent.prototype.constructor = RPCAgent;

// this is used when loading rpc with options 3 and 4
RPCAgent.prototype.minus = function (params, sender) {
  return params.a - params.b;
};

// define RPC functions, I prefer to have them seperated.
RPCAgent.prototype.rpcFunctions = {};
RPCAgent.prototype.rpcFunctions.add = function (params, sender) {
  return params.a + params.b;
};

RPCAgent.prototype.askToAdd = function (to, params) {
  var message = {method: 'add', params: params};
  this.rpc.request(to, message).then(function (reply) {
    console.log('The agent told me that', params.a, '+', params.b, '=', reply);
  });
};

module.exports = RPCAgent;
