var assert = require('assert');
var Agent = require('../../lib/Agent');

describe ('RPC', function () {

  it('should add an RPC module', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    var sender = 'agent2';
    var checkParams = {a:1,b:3};


    agent1.rpcFunctions = {};
    agent2.rpcFunctions = {};
    agent1.rpcFunctions.add = function (params,from) {
      assert.equal(from, sender);
      assert.deepEqual(params, checkParams);
      return params.a + params.b;
    }
    agent1.rpc = agent1.loadModule("rpc", agent1.rpcFunctions)
    agent2.rpc = agent2.loadModule("rpc", agent2.rpcFunctions)


    return agent2.rpc.request("agent1",{method:"add",params:{a:1,b:3}}).then(
      function (reply) {
        assert.equal(reply, 3);
      })
  });

//  it('should add and remove a pattern listener using loadModule', function () {
//    var agent = new Agent('agent1');
//    var sender = 'agent2';
//    var count = 0;
//
//    agent.pattern = agent.loadModule('pattern');
//
//    var pattern = 'hello';
//    var listener = function (from, message) {
//      assert.equal(from, sender);
//      count++;
//    };
//
//    // add the listener, test if listener is triggered
//    agent.pattern.listen(pattern, listener);
//    agent._receive(sender, pattern);
//    assert.equal(count, 1);
//
//    // remove the listener, test if listener is not triggered anymore
//    agent.pattern.unlisten(pattern, listener);
//    agent._receive(sender, pattern);
//    assert.equal(count, 1);
//  });
//
//  it('should listen to messages using a string pattern', function (done) {
//    var agent = new Agent('agent1').extend('pattern');
//
//    agent.listen('hello', function (from, message) {
//      assert.equal(from, 'agent2');
//      assert.equal(message, 'hello');
//      done();
//    });
//
//    agent._receive('agent2', 'hello');
//  });
//
//  it('should listen to messages using a regexp pattern', function (done) {
//    var agent = new Agent('agent1').extend('pattern');
//
//    agent.listen(/hello/, function (from, message) {
//      assert.equal(from, 'agent2');
//      assert.equal(message, 'hello, my name is agent2');
//      done();
//    });
//
//    agent._receive('agent2', 'hi there'); // this message should be ignored
//    agent._receive('agent2', 'hello, my name is agent2');
//  });
//
//  it('should listen to messages using a function pattern', function (done) {
//    var agent = new Agent('agent1').extend('pattern');
//
//    agent.listen(function (message) {
//      return message.indexOf('hello') != -1;
//    }, function (from, message) {
//      assert.equal(from, 'agent2');
//      assert.equal(message, 'hello, my name is agent2');
//      done();
//    });
//
//    agent._receive('agent2', 'hi there'); // this message should be ignored
//    agent._receive('agent2', 'hello, my name is agent2');
//  });
//
//  it('should deliver a message to multiple matching listeners', function () {
//    var agent = new Agent('agent1').extend('pattern');
//
//    var log = [];
//
//    function callback (from, message) {
//      log.push([from, message]);
//    }
//
//    agent.listen(/hi/, callback);
//    agent.listen(/there/, callback);
//
//    agent._receive('agent2', 'hi there');
//
//    assert.deepEqual(log, [
//      ['agent2', 'hi there'],
//      ['agent2', 'hi there']
//    ]);
//  });
//
//  it('should deliver a message to the first matching listeners', function () {
//    var agent = new Agent('agent1').extend('pattern', {stopPropagation: true});
//
//    var log = [];
//
//    function callback (from, message) {
//      log.push([from, message]);
//    }
//
//    agent.listen(/hi/, callback);
//    agent.listen(/there/, callback);
//
//    agent._receive('agent2', 'hi there');
//    assert.deepEqual(log, [
//      ['agent2', 'hi there']
//    ]);
//  });

  // TODO: test Pattern.destroy

});
