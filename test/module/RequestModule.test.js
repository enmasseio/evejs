var assert = require('assert');
var Promise = require('promise');
var Agent = require('../../lib/Agent');
var LocalTransport = require('../../lib/transport/local/LocalTransport');

describe ('Request', function () {

  // TODO: test Request itself, isolated from Agent

  it('should send a request and receive a reply', function () {
    var agent1 = new Agent('agent1').extend('request');
    var agent2 = new Agent('agent2').extend('request');

    agent1.receive = function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'test');
      return message + message;
    };

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'test')
        .then(function (reply) {
          assert.equal(reply, 'testtest');
        });
  });

  it('should send a request and receive a reply (loaded via loadModule)', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2');

    agent1.request = agent1.loadModule('request');
    agent2.request = agent2.loadModule('request');

    agent1.receive = function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'test');
      return message + message;
    };

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request.request('agent1', 'test')
        .then(function (reply) {
          assert.equal(reply, 'testtest');
        });
  });

  it('should send a request and get a timeout if no reply is send', function () {
    var agent1 = new Agent('agent1');
    var agent2 = new Agent('agent2').extend('request', {timeout: 50});

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'test')
        .then(function (reply) {
          assert.ok(false, 'should not reply');
        })
        .catch(function (err) {
          assert.equal(err.toString(), 'Error: Timeout');
        });
  });

  it('should send a request and receive a reply resolved by a promise', function () {
    var agent1 = new Agent('agent1').extend('request');
    var agent2 = new Agent('agent2').extend('request');

    agent1.receive = function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'test');
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve(message + message);
        }, 50);
      });
    };

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'test')
        .then(function (reply) {
          assert.equal(reply, 'testtest');
        });
  });

  it('should retrurn a reply resolved by a pattern listener', function () {
    var agent1 = new Agent('agent1').extend(['pattern', 'request']);
    var agent2 = new Agent('agent2').extend(['pattern', 'request']);

    agent1.listen('foo', function (from, message) {
      return 'bar'
    });

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'foo')
        .then(function (reply) {
          assert.equal(reply, 'bar');
        });
  });

  it('should retrurn a reply resolved by a pattern listener (2)', function () {
    // load modules in the wrong order (-> pattern must be loaded first by the agent anyways)
    var agent1 = new Agent('agent1').extend(['request', 'pattern']);
    var agent2 = new Agent('agent2').extend(['request', 'pattern']);

    agent1.listen('foo', function (from, message) {
      return 'bar'
    });

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'foo')
        .then(function (reply) {
          assert.equal(reply, 'bar');
        });
  });

  it('should handle errors thrown by the agents receive method', function () {
    var agent1 = new Agent('agent1').extend('request');
    var agent2 = new Agent('agent2').extend('request');

    agent1.receive = function (from, message) {
      throw new Error('oops');
    };

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'foo')
        .then(function (reply) {
          assert.ok(false, 'Should not resolve');
        })
        .catch(function (err) {
          assert(err instanceof Error);
          assert.equal(err.message, 'oops');
        });
  });

  it('should handle errors returned via rejected promise', function () {
    var agent1 = new Agent('agent1').extend('request');
    var agent2 = new Agent('agent2').extend('request');

    agent1.receive = function (from, message) {
      return Promise.reject(new Error('oops'));
    };

    var transport = new LocalTransport();
    agent1.connect(transport);
    agent2.connect(transport);

    return agent2.request('agent1', 'foo')
        .then(function (reply) {
          assert.ok(false, 'Should not resolve');
        })
        .catch(function (err) {
          assert(err instanceof Error);
          assert.equal(err.message, 'oops');
        });
  });

  // TODO: test with multiple messages in queue

  // TODO: test Request.destroy

  // TODO: test in combination with the rpc module (when implemented)

});
