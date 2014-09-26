var assert = require('assert');
var Agent = require('../../lib/Agent');
var PatternModule = require('../../lib/module/PatternModule');
Agent.registerModule(PatternModule);

describe ('Pattern', function () {

  // TODO: should test Pattern isolated from Agent

  it('should add and remove a pattern listener', function () {
    var agent = new Agent('agent1').extend('pattern');
    var sender = 'agent2';
    var count = 0;

    var pattern = 'hello';
    var listener = function (from, message) {
      assert.equal(from, sender);
      count++;
    };

    // add the listener, test if listener is triggered
    agent.listen(pattern, listener);
    agent._receive(sender, pattern);
    assert.equal(count, 1);

    // remove the listener, test if listener is not triggered anymore
    agent.unlisten(pattern, listener);
    agent._receive(sender, pattern);
    assert.equal(count, 1);
  });

  it('should add and remove a pattern listener using loadModule', function () {
    var agent = new Agent('agent1');
    var sender = 'agent2';
    var count = 0;

    agent.pattern = agent.loadModule('pattern');

    var pattern = 'hello';
    var listener = function (from, message) {
      assert.equal(from, sender);
      count++;
    };

    // add the listener, test if listener is triggered
    agent.pattern.listen(pattern, listener);
    agent._receive(sender, pattern);
    assert.equal(count, 1);

    // remove the listener, test if listener is not triggered anymore
    agent.pattern.unlisten(pattern, listener);
    agent._receive(sender, pattern);
    assert.equal(count, 1);
  });

  it('should listen to messages using a string pattern', function (done) {
    var agent = new Agent('agent1').extend('pattern');

    agent.listen('hello', function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hello');
      done();
    });

    agent._receive('agent2', 'hello');
  });

  it('should listen to messages using a regexp pattern', function (done) {
    var agent = new Agent('agent1').extend('pattern');

    agent.listen(/hello/, function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hello, my name is agent2');
      done();
    });

    agent._receive('agent2', 'hi there'); // this message should be ignored
    agent._receive('agent2', 'hello, my name is agent2');
  });

  it('should listen to messages using a function pattern', function (done) {
    var agent = new Agent('agent1').extend('pattern');

    agent.listen(function (message) {
      return message.indexOf('hello') != -1;
    }, function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hello, my name is agent2');
      done();
    });

    agent._receive('agent2', 'hi there'); // this message should be ignored
    agent._receive('agent2', 'hello, my name is agent2');
  });

  it('should deliver a message to multiple matching listeners', function () {
    var agent = new Agent('agent1').extend('pattern');

    var log = [];

    function callback (from, message) {
      log.push([from, message]);
    }

    agent.listen(/hi/, callback);
    agent.listen(/there/, callback);

    agent._receive('agent2', 'hi there');

    assert.deepEqual(log, [
      ['agent2', 'hi there'],
      ['agent2', 'hi there']
    ]);
  });

  it('should deliver a message to the first matching listeners', function () {
    var agent = new Agent('agent1').extend('pattern', {stopPropagation: true});

    var log = [];

    function callback (from, message) {
      log.push([from, message]);
    }

    agent.listen(/hi/, callback);
    agent.listen(/there/, callback);

    agent._receive('agent2', 'hi there');
    assert.deepEqual(log, [
      ['agent2', 'hi there']
    ]);
  });

  // TODO: test Pattern.destroy

});
