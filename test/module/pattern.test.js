var assert = require('assert');
var Agent = require('../../lib/Agent');

describe ('pattern', function () {

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
    agent.receive(sender, pattern);
    assert.equal(count, 1);

    // remove the listener, test if listener is not triggered anymore
    agent.unlisten(pattern, listener);
    agent.receive(sender, pattern);
    assert.equal(count, 1);
  });

  it('should listen to messages using a string pattern', function (done) {
    var agent = new Agent('agent1').extend('pattern');

    agent.listen('hello', function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hello');
      done();
    });

    agent.receive('agent2', 'hello');
  });

  it('should listen to messages using a regexp pattern', function (done) {
    var agent = new Agent('agent1').extend('pattern');

    agent.listen(/hello/, function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hello, my name is agent2');
      done();
    });

    agent.receive('agent2', 'hi there'); // this message should be ignored
    agent.receive('agent2', 'hello, my name is agent2');
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

    agent.receive('agent2', 'hi there'); // this message should be ignored
    agent.receive('agent2', 'hello, my name is agent2');
  });

});
