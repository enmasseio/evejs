var assert = require('assert');
var LocalTransport = require('../../lib/transport/local/LocalTransport');
var Promise = require('promise');
var Agent = require('../../lib/Agent');
var RPCModule = require('../../lib/module/RPCModule');
Agent.registerModule(RPCModule);

describe ('RPC', function () {
  var agent1;
  var agent2;

  before(function () {
    agent1 = new Agent('agent1');
    agent2 = new Agent('agent2');

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

    agent1.rpcFunctions.addPromise = function (params, from) {
      return new Promise(function (resolve,reject) {
        resolve(params.a + params.b);
      });
    };
    agent1.rpcFunctions.addPromiseErr = function (params, from) {
      return new Promise(function (resolve,reject) {
        reject("Cannot compute something that easy!");
      });
    };

    agent1.rpcFunctions.throwError = function (params, from) {
      throw new Error("help")
    };

    agent1.rpcFunctions.shouldGiveError = function (params, from) {
      var a = abc + def; // UNDEFINED VARIABLES!
      return a;
    };
    agent1.rpcFunctions.nothing = function () {}; // does not return anything
    agent1.extend("rpc", agent1.rpcFunctions);
    agent2.extend("rpc", agent2.rpcFunctions);
  });

  it('should load an RPC module', function () {
    var agent3 = new Agent('agent3');
    var agent4 = new Agent('agent4');

    var transport = new LocalTransport();
    agent3.connect(transport);
    agent4.connect(transport);

    var sender = 'agent4';
    var checkParams = {a:1,b:3};

    agent3.rpcFunctions = {};
    agent4.rpcFunctions = {};
    agent3.rpcFunctions.add = function (params, from) {
      assert.equal(from, sender);
      assert.deepEqual(params, checkParams);
      return params.a + params.b;
    };
    agent3.rpc = agent3.loadModule("rpc", agent3.rpcFunctions);
    agent4.rpc = agent4.loadModule("rpc", agent4.rpcFunctions);

    return agent4.rpc.request("agent3",{method:"add",params:{a:1,b:3}}).then(
      function (reply) {
        assert.equal(reply, 4);
      })
  });

  it('should extend the agent with an RPC module', function () {
    return agent2.request("agent1",{method:"add",params:{a:1,b:3}})
        .then(function (reply) {
          assert.equal(reply, 4);
        })
  });

  it('should catch not having a method', function () {
    return agent2.request("agent1",{params:{a:1,b:3}})
        .catch(function (err) {
          assert.equal(err, "Error: Property \"method\" expected")
        })
  });

  it('should catch agent not found', function () {
    return agent2.request("agent30",{method:"foo",params:{a:1,b:3}})
      .catch(function (err) {
        assert.equal(err, "Error: Agent with id agent30 not found")
      })
  });

  it('should catch method not found', function () {
    return agent2.request("agent1",{method:"foo",params:{a:1,b:3}})
        .catch(function (err) {
          assert.equal(err, "Error: Cannot find function: foo")
        })
  });

  it('should catch message not an object', function () {
    return agent2.request("agent1","hello")
        .catch(function (err) {
          assert.equal(err.toString(), "TypeError: Message must be an object")
        })
  });

  it('should catch undefined return value', function () {
    return agent2.request("agent1", {method: "nothing"})
      .then(function (reply) {
        assert.strictEqual(reply, null)
      })
      .catch(function (err) {
        console.log(err.toString());
        assert.ok(false, 'Should not throw an error')
      })
  });

  it('should catch no message', function () {
    return agent2.request("agent1")
        .catch(function (err) {
          assert.equal(err.toString(), "TypeError: Message must be an object")
        })
  });

  it('should understand a promise as reply', function () {
    return agent2.request("agent1",{method:"addPromise",params:{a:1,b:3}})
      .then(function (reply) {
        assert.equal(reply, 4);
      })
  });

  it('should be possible to interchange then and done', function () {
    return agent2.request("agent1",{method:"add",params:{a:1,b:3}})
      .done(function (reply) {
        assert.equal(reply, 4);
      })
  });


  it('should catch an error when promise as reply and is rejected', function () {
    return agent2.request("agent1",{method:"addPromiseErr",params:{a:1,b:3}})
      .catch(function (err) {
        assert.equal(err, "Error: Cannot compute something that easy!");
      })
  });

  it('should propagate error and catch', function () {
    return agent2.request("agent1",{method:"throwError",params:{a:1,b:3}})
      .catch(function (err) {
        assert.equal(err, "Error: help");
      })
  });

  it('should give error and catch', function () {
    return agent2.request("agent1",{method:"shouldGiveError",params:{a:1,b:3}})
      .then(function (reply) {
        console.log('REPLY',reply);
      })
      .catch(function (err) {
        assert.equal(err, "ReferenceError: abc is not defined");
      })
  });

  it('should give error and catch', function () {
    return agent2.request("agent1",{method:"shouldGiveError",params:{a:1,b:3}})
      .catch(function (err) {
        assert.equal(err, "ReferenceError: abc is not defined");
      })
    //agent2.request("agent1",{method:"shouldGiveError",params:{a:1,b:3}}).done() crashes, which is good
  });

  // TODO: test whether the response has the same id as the request.
});
