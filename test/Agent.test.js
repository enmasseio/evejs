var assert = require('assert');
var Agent = require('../lib/Agent');
var LocalTransport = require('../lib/transport/LocalTransport');

describe('Agent', function() {

  describe ('creation', function () {

    it('should create an agent without id', function () {
      var agent = new Agent();
      assert.ok(agent instanceof Agent);
      assert.ok(agent.id && agent.id.length);
    });

    it('should create an agent with id', function () {
      var agent = new Agent('agent1');
      assert.ok(agent instanceof Agent);
      assert.equal(agent.id, 'agent1');
    });
  });

  describe ('message listeners', function () {

    it('should add and remove a message listener', function () {
      var agent = new Agent('agent1');
      var sender = 'agent2';
      var count = 0;

      var pattern = 'hello';
      var listener = function (from, message) {
        assert.equal(from, sender);
        count++;
      };

      // add the listener, test if listener is triggered
      agent.on(pattern, listener);
      agent.onMessage(sender, pattern);
      assert.equal(count, 1);

      // remove the listener, test if listener is not triggered anymore
      agent.off(pattern, listener);
      agent.onMessage(sender, pattern);
      assert.equal(count, 1);
    });

    it('should listen to messages using a string pattern', function (done) {
      var agent = new Agent('agent1');

      agent.on('hello', function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      });

      agent.onMessage('agent2', 'hello');
    });

    it('should listen to messages using a regexp pattern', function (done) {
      var agent = new Agent('agent1');

      agent.on(/hello/, function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello, my name is agent2');
        done();
      });

      agent.onMessage('agent2', 'hi there'); // this message should be ignored
      agent.onMessage('agent2', 'hello, my name is agent2');
    });

    it('should listen to messages using a function pattern', function (done) {
      var agent = new Agent('agent1');

      agent.on(function (message) {
        return message.indexOf('hello') != -1;
      }, function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello, my name is agent2');
        done();
      });

      agent.onMessage('agent2', 'hi there'); // this message should be ignored
      agent.onMessage('agent2', 'hello, my name is agent2');
    });

  });

  describe ('transport', function () {
    it('should send a message via a transport', function (done) {
      var transport = new LocalTransport();

      var agent1 = new Agent('agent1');
      agent1.connect(transport);
      var agent2 = new Agent('agent2');
      agent2.connect(transport);

      agent1.on('hello', function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      });

      agent2.send('agent1', 'hello');
    });

    it.skip('should connect with an alternative id', function (done) {
      var transport = new LocalTransport();

      var agent1 = new Agent('agent1');
      agent1.connect(transport, '007');
      var agent2 = new Agent('agent2');
      agent2.connect(transport);

      agent1.on('hello', function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      });

      agent2.send('007', 'hello');
    });

    it('should connect and disconnect multiple transports at once', function () {
      var transport1 = new LocalTransport();
      var transport2 = new LocalTransport();

      var agent1 = new Agent('agent1');
      return agent1.connect([transport1, transport2])
          .then(function (results) {
            assert.equal(results.length, 2);
            assert.strictEqual(results[0], agent1);
            assert.strictEqual(results[1], agent1);
            assert.deepEqual(Object.keys(transport1.peers), ['agent1']);
            assert.deepEqual(Object.keys(transport2.peers), ['agent1']);
          })
          .then(function () {
            agent1.disconnect([transport1, transport2]);

            assert.deepEqual(agent1.connections, []);
            assert.deepEqual(Object.keys(transport1.peers), []);
            assert.deepEqual(Object.keys(transport2.peers), []);
          });
    });

    it('should disconnect all transports at once', function () {
      var transport1 = new LocalTransport();
      var transport2 = new LocalTransport();

      var agent1 = new Agent('agent1');
      return agent1.connect([transport1, transport2])
          .then(function (results) {
            assert.equal(results.length, 2);
            assert.strictEqual(results[0], agent1);
            assert.strictEqual(results[1], agent1);
            assert.deepEqual(Object.keys(transport1.peers), ['agent1']);
            assert.deepEqual(Object.keys(transport2.peers), ['agent1']);
          })
          .then(function () {
            agent1.disconnect();

            assert.deepEqual(agent1.connections, []);
            assert.deepEqual(Object.keys(transport1.peers), []);
            assert.deepEqual(Object.keys(transport2.peers), []);
          });
    });

    it('should resolve a promise when connected to a transport', function () {
      var transport = new LocalTransport();
      var agent1 = new Agent('agent1');

      return agent1.connect(transport).then(function (agent) {
        assert.strictEqual(agent, agent1);
      });
    });

    it('should connect to multiple transports', function (done) {
      var transport1 = new LocalTransport();
      var transport2 = new LocalTransport();

      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');
      var agent3 = new Agent('agent3');

      agent1.connect(transport1);
      agent2.connect(transport1);

      agent2.connect(transport2);
      agent3.connect(transport2);

      var count = 0;

      function log(from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');

        count++;
        if (count == 2) {
          done();
        }
      }

      agent1.on('hello', log);
      agent3.on('hello', log);

      // send messages to agents connected via a different transport
      agent2.send('agent1', 'hello');
      agent2.send('agent3', 'hello');
    });
  });

});
