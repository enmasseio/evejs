var assert = require('assert');
var LocalTransport = require('../../lib/transport/local/LocalTransport');
var Agent = require('../../lib/Agent');

describe ('RPC', function () {

  it('should load an RPC module', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    var sender = 'agent2';
    var checkParams = {a:1,b:3};


    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpcFunctions.add = function (params, from) {
      assert.equal(from, sender);
      assert.deepEqual(params, checkParams);
      return params.a + params.b;
    };
    agent1.rpc = agent1.loadModule("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.loadModule("rpc", agent2.rpcFunctions);

    return agent2.rpc.request("agent1",{method:"add",params:{a:1,b:3}}).then(
      function (reply) {
        assert.equal(reply, 4);
      })
  });

  it('should extend the agent with an RPC module', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    var sender = 'agent2';
    var checkParams = {a:1,b:3};


    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpcFunctions.add = function (params, from) {
      assert.equal(from, sender);
      assert.deepEqual(params, checkParams);
      return params.a + params.b;
    };
    agent1.rpc = agent1.extend("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.extend("rpc", agent2.rpcFunctions);

    return agent2.request("agent1",{method:"add",params:{a:1,b:3}}).then(
      function (reply) {
        assert.equal(reply, 4);
      })
  });

  it('should catch not having a method', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpc = agent1.extend("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.extend("rpc", agent2.rpcFunctions);

    return agent2.request("agent1",{params:{a:1,b:3}})
      .then()
      .catch(function (err) {assert.equal(err, "Error: Method must be supplied.")})
  });

  it('should catch method not found', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpc = agent1.extend("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.extend("rpc", agent2.rpcFunctions);

    return agent2.request("agent1",{method:"add",params:{a:1,b:3}})
      .then()
      .catch(function (err) {assert.equal(err, "Error: Cannot find function: add")})
  });

  it('should catch message not an object', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpc = agent1.extend("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.extend("rpc", agent2.rpcFunctions);

    return agent2.request("agent1","hello")
      .then()
      .catch(function (err) {assert.equal(err, "Error: Message must be an object.")})
  });

  it('should catch no message', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpc = agent1.extend("rpc", agent1.rpcFunctions);
    agent2.rpc = agent2.extend("rpc", agent2.rpcFunctions);

    return agent2.request("agent1")
      .then()
      .catch(function (err) {assert.equal(err, "Error: Message is empty.")})
  });

});
