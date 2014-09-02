var assert = require('assert');
var Agent = require('../lib/Agent');
var system = require('../lib/system');
var LocalTransport = require('../lib/transport/local/LocalTransport');
var DistribusTransport = require('../lib/transport/distribus/DistribusTransport');

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

    it('should connect to a transport by id', function () {
      var agent1 = new Agent('agent1');

      system.init({
        transports: [
          {
            id: 't1',
            type: 'local'
          },
          {
            id: 't2',
            type: 'distribus'
          }
        ]
      });

      var conn = agent1.connect('t1');
      assert.equal(conn.transport.id, 't1');
    });

    it('should disconnect from a transport by id', function () {
      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      system.init({
        transports: [
          {
            id: 't1',
            type: 'local'
          },
          {
            id: 't2',
            type: 'distribus'
          }
        ]
      });

      var conn = agent1.connect('t1');
      assert.equal(conn.transport.id, 't1');

      agent1.disconnect('t1');
      assert.deepEqual(agent1.connections, []);
    });

    it('should connect and disconnect multiple transports at once', function () {
      var transport1 = new LocalTransport();
      var transport2 = new LocalTransport();

      var agent1 = new Agent('agent1');
      var connections = agent1.connect([transport1, transport2]);

      assert.equal(connections.length, 2);
      assert.strictEqual(connections[0].transport, transport1);
      assert.strictEqual(connections[1].transport, transport2);
      assert.strictEqual(agent1.defaultConnection.transport, transport1);
      assert.deepEqual(Object.keys(transport1.agents), ['agent1']);
      assert.deepEqual(Object.keys(transport2.agents), ['agent1']);

      agent1.disconnect([transport1, transport2]);

      assert.deepEqual(agent1.connections, []);
      assert.strictEqual(agent1.defaultConnection, null);
      assert.deepEqual(Object.keys(transport1.agents), []);
      assert.deepEqual(Object.keys(transport2.agents), []);
    });

    it('should disconnect all transports at once', function () {
      var transport1 = new LocalTransport();
      var transport2 = new LocalTransport();

      var agent1 = new Agent('agent1');
      var connections = agent1.connect([transport1, transport2]);

      assert.equal(connections.length, 2);
      assert.strictEqual(connections[0].transport, transport1);
      assert.strictEqual(connections[1].transport, transport2);
      assert.strictEqual(agent1.defaultConnection.transport, transport1);
      assert.deepEqual(Object.keys(transport1.agents), ['agent1']);
      assert.deepEqual(Object.keys(transport2.agents), ['agent1']);

      agent1.disconnect();

      assert.deepEqual(agent1.connections, []);
      assert.strictEqual(agent1.defaultConnection, null);
      assert.deepEqual(Object.keys(transport1.agents), []);
      assert.deepEqual(Object.keys(transport2.agents), []);
    });

    it('should send a message with agentId@transportId notation', function (done) {
      var transport1 = new LocalTransport({id: 'local1'});
      var transport2 = new LocalTransport({id: 'local2'});

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
      agent2.send('agent3@local2', 'hello');
    });

    it('should send a message with protocol://networkId/agentId notation', function (done) {
      var transport1 = new LocalTransport({id: 'local1'});
      var transport2 = new DistribusTransport({networkId: 'distribus1'});

      var agent1 = new Agent('agent1');
      var agent2a = new Agent('agent2');
      var agent2b = new Agent('agent2');

      agent1.connect(transport1);
      agent2a.connect(transport1);

      agent1.connect(transport2);
      agent2b.connect(transport2);

      var count2a = 0;
      var count2b = 0;

      agent2a.receive = function (from, message) {
        assert.equal(from, 'agent1');
        assert.equal(message, 'hello');

        count2a++;
        if (count2a == 1 && count2b == 1) {
          done();
        }
      };

      agent2b.receive = function (from, message) {
        assert.equal(from, 'agent1');
        assert.equal(message, 'hello');

        count2b++;
        if (count2a == 1 && count2b == 1) {
          done();
        }
      };

      // send messages to agents connected via a different transport
      agent1.send('local://local1/agent2', 'hello');
      agent1.send('distribus://distribus1/agent2', 'hello');
    });

    it('should send a message with the default transport', function (done) {
      var transport1 = new LocalTransport({id: 'local1'});
      var transport2 = new LocalTransport({id: 'local2', 'default': true});

      var agent2 = new Agent('agent2');
      var agent3 = new Agent('agent3');

      agent2.connect(transport1);

      agent2.connect(transport2);
      agent3.connect(transport2);

      agent3.receive = function (from, message) {
        assert.equal(from, 'agent2');
        assert.equal(message, 'hello');
        done();
      };

      // send messages to agents connected via a different transport
      agent2.send('agent3', 'hello'); // should go over local1
    });

  });

  // TODO: test loadModule
  // TODO: test Agent.ready

});
