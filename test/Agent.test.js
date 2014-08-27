var assert = require('assert');
var Agent = require('../lib/Agent');
var LocalTransport = require('../lib/transport/LocalTransport');
var DistribusTransport = require('../lib/transport/DistribusTransport');

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

  describe ('transport', function () {
    it('should send a message via a transport', function (done) {
      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      var transport = new LocalTransport();
      agent1.connect(transport);
      agent2.connect(transport);

      agent1.receive = function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      };

      agent2.send('agent1', 'hello');
    });

    it('should connect with an alternative id', function (done) {
      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      var transport = new LocalTransport();
      agent1.connect(transport, '007');
      agent2.connect(transport);

      agent1.receive = function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      };

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
            assert.deepEqual(Object.keys(transport1.agents), ['agent1']);
            assert.deepEqual(Object.keys(transport2.agents), ['agent1']);
          })
          .then(function () {
            agent1.disconnect([transport1, transport2]);

            assert.deepEqual(agent1.connections, []);
            assert.deepEqual(Object.keys(transport1.agents), []);
            assert.deepEqual(Object.keys(transport2.agents), []);
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
            assert.deepEqual(Object.keys(transport1.agents), ['agent1']);
            assert.deepEqual(Object.keys(transport2.agents), ['agent1']);
          })
          .then(function () {
            agent1.disconnect();

            assert.deepEqual(agent1.connections, []);
            assert.deepEqual(Object.keys(transport1.agents), []);
            assert.deepEqual(Object.keys(transport2.agents), []);
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

      agent1.receive = log;
      agent3.receive = log;

      // send messages to agents connected via a different transport
      agent2.send('agent1', 'hello');
      agent2.send('agent3', 'hello');
    });

    it('should send a message via a specific transport type', function (done) {
      var transport1 = new LocalTransport();
      var transport2 = new DistribusTransport();

      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      agent1.connect(transport1);
      agent1.connect(transport2);

      agent2.connect(transport1);
      agent2.connect(transport2);

      function log(from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');

        done();
      }

      agent1.receive = log;

      // send messages to agents connected via a the specified transport
      agent2.send({id: 'agent1', transport: 'distribus'}, 'hello');
    });

    it('should send a message via a specific transport id', function (done) {
      var transport1 = new LocalTransport({id: '1'});
      var transport2 = new DistribusTransport({id: '2'});

      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      agent1.connect(transport1);
      agent1.connect(transport2);

      agent2.connect(transport1);
      agent2.connect(transport2);

      function log(from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');

        done();
      }

      agent1.receive = log;

      // send messages to agents connected via a the specified transport
      agent2.send({id: 'agent1', transportId: '2'}, 'hello');
    });
  });

  // TODO: test extendTo

});
