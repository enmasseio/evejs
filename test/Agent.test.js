var assert = require('assert');
var Promise = require('promise');
var Agent = require('../lib/Agent');
var TransportManager = require('../lib/TransportManager');
var LocalTransport = require('../lib/transport/local/LocalTransport');
var DistribusTransport = require('../lib/transport/distribus/DistribusTransport');
var WebSocketTransport = require('../lib/transport/websocket/WebSocketTransport');

TransportManager.registerType(LocalTransport);
TransportManager.registerType(DistribusTransport);
TransportManager.registerType(WebSocketTransport);

/**
 * Get a free local port
 * @returns {Promise.<number>} Resolves with a free port number
 */
function freeport () {
  return new Promise(function (resolve, reject) {
    var f = require('freeport');
    f(function (err, port) {
      err ? reject(err) : resolve(port);
    })
  });
}

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

      var transports = {
        t1: new LocalTransport({id: 't1'}),
        t2: new DistribusTransport({id: 't2'})
      };
      Agent.getTransportById = function (id) {
        return transports[id];
      };

      var conn = agent1.connect('t1');
      assert.equal(conn.transport.id, 't1');
    });

    it('should disconnect from a transport by id', function () {
      var agent1 = new Agent('agent1');
      var agent2 = new Agent('agent2');

      var transports = {
        t1: new LocalTransport({id: 't1'}),
        t2: new DistribusTransport({id: 't2'})
      };
      Agent.getTransportById = function (id) {
        return transports[id];
      };

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

    it('should send a message via websocket transport', function () {
      var transport1;
      var transport2;
      var agent1;
      var agent2;
      var conn1;
      var conn2;

      return Promise.all([freeport(), freeport()])
          .then(function (ports) {
            transport1 = new WebSocketTransport({url: 'ws://localhost:' + ports[0] + '/agents/:id'});
            transport2 = new WebSocketTransport({url: 'ws://localhost:' + ports[1] + '/agents/:id'});

            return Promise.all([transport1.ready, transport2.ready]);
          })
          .then(function () {
            agent1 = new Agent('agent1');
            agent2 = new Agent('agent2');

            conn1 = agent1.connect(transport1);
            conn2 = agent2.connect(transport2);

            return Promise.all([conn1.ready, conn2.ready]);
          })
          .then(function () {
            return new Promise(function (resolve, reject) {
              agent1.receive = function (from, message) {
                try {
                  assert.equal(from, conn2.url);
                  assert.equal(message, 'hello');
                  resolve();
                }
                catch (err) {
                  reject(err);
                }
              };

              // send messages to the agent on an other websocket server
              agent2.send(conn1.url, 'hello');
            });
          })
          .then(function () {
            transport1.close();
            transport2.close();
          });
    });

    it('should throw an error when sending a message without transport configured', function () {
      var agent1 = new Agent('agent1');

      // send messages to agents connected via a different transport
      return agent1.send('agent2', 'hello')
          .then(function () {
            assert.ok(false, 'should not succeed')
          })
          .catch(function (err) {
            assert.equal(err.toString(), 'Error: No transport found');
          })
    });

  });

  // TODO: test loadModule
  // TODO: test Agent.ready

});
