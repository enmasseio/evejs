var assert = require('assert');
var Promise = require('promise');
var WebSocketTransport = require('../../lib/transport/websocket/WebSocketTransport');
var util = require('../../lib/util');

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

describe('WebSocketTransport', function() {

  it('should create a WebSocketTransport with default config', function () {
    var transport = new WebSocketTransport();
    assert.ok(transport instanceof WebSocketTransport);
    assert.strictEqual(transport.type, 'ws');
    assert.strictEqual(transport.localShortcut, true);
  });

  it('should create a WebSocketTransport with id', function () {
    var transport = new WebSocketTransport({id: 'foo'});
    assert.ok(transport instanceof WebSocketTransport);
    assert.strictEqual(transport.type, 'ws');
    assert.strictEqual(transport.id, 'foo');
    assert.strictEqual(transport.localShortcut, true);
  });

  it('should create a WebSocketTransport with localShortcut==false', function () {
    var transport = new WebSocketTransport({localShortcut: false});
    assert.ok(transport instanceof WebSocketTransport);
    assert.strictEqual(transport.localShortcut, false);
  });

  it('should throw an error when configuring an invalid url', function () {
    assert.throws(function () {
      new WebSocketTransport({url: 'foo'});
    }, /Error: Invalid protocol, "ws:" expected/);
    assert.throws(function () {
      new WebSocketTransport({url: 'http://foo.com'});
    }, /Error: Invalid protocol, "ws:" expected/);
    assert.throws(function () {
      new WebSocketTransport({url: 'ws://foo.com'});
    }, /Error: ":id" placeholder missing in url/);
  });

  it('should send a message via localShortcut', function () {
    var transport = new WebSocketTransport({
      localShortcut: true
    });
    var count = 0;

    // connect and send a message
    var conn1 = transport.connect('ws://localhost:3000/agents/agent1', function (from, message) {
      assert.equal(from, 'ws://localhost:3000/agents/agent2');
      assert.equal(message, 'hi there');
      count++;
    });
    assert.deepEqual(Object.keys(transport.agents).sort(),
        ['ws://localhost:3000/agents/agent1']);

    var conn2 = transport.connect('ws://localhost:3000/agents/agent2', function (from, message) {});
    assert.deepEqual(Object.keys(transport.agents).sort(),
        ['ws://localhost:3000/agents/agent1', 'ws://localhost:3000/agents/agent2']);

    return conn2.send('ws://localhost:3000/agents/agent1', 'hi there')
        .then(function () {
          assert.equal(count, 1);
        })
        .then(function () {
          // disconnect
          conn1.close();
          assert.deepEqual(Object.keys(transport.agents).sort(),
              ['ws://localhost:3000/agents/agent2']);

          return conn2.send('ws://localhost:3000/agents/agent1', 'hi there');
        })
        .then(function () {
          assert.ok(false, 'should not succeed sending message to disconnected agent1');
        })
        .catch(function(err) {
          assert.equal(err.toString(), 'Error: Failed to connect to agent "ws://localhost:3000/agents/agent1"');
        });

  });

  it('should send a message via socket', function () {
    var url1;
    var url2;
    var transport1;
    var transport2;

    return Promise.all([freeport(), freeport()])
        .then(function (ports) {
          url1 = 'ws://localhost:' + ports[0] + '/agents/:id';
          url2 = 'ws://localhost:' + ports[1] + '/agents/:id/'; // NOTE: We add a trailing slash here, see if that is neatly handled

          transport1 = new WebSocketTransport({url: url1});
          transport2 = new WebSocketTransport({url: url2});

          return Promise.all([transport1.ready, transport2.ready]);
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            var urlAgent1 = url1.replace(':id', 'agent1');
            var urlAgent2 = util.normalizeURL(url2.replace(':id', 'agent2'));

            // connect and send a message
            var conn1 = transport1.connect('agent1', function (from, message) {
              assert.equal(from, urlAgent2);
              assert.equal(message, 'hi there');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

              // send a message back
              conn1.send(from, 'hello');
            });
            assert.equal(conn1.url, urlAgent1);

            var conn2 = transport2.connect('agent2', function (from, message) {
              assert.equal(from, urlAgent1);
              assert.equal(message, 'hello');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

              resolve();
            });
            assert.equal(conn2.url, urlAgent2);

            Promise.all([conn1.ready, conn2.ready])
                .then(function () {
                  conn2.send(urlAgent1, 'hi there');
                });
          });
        });
  });

  it('should open a socket via connect, test list', function () {
    var url1;
    var url2;
    var transport1;
    var transport2;
    var conn1;
    var conn2;
    var urlAgent1;
    var urlAgent2;

    return Promise.all([freeport(), freeport()])
        .then(function (ports) {
          url1 = 'ws://localhost:' + ports[0] + '/agents/:id';
          url2 = 'ws://localhost:' + ports[1] + '/agents/:id';

          transport1 = new WebSocketTransport({url: url1});
          transport2 = new WebSocketTransport({url: url2});

          return Promise.all([transport1.ready, transport2.ready]);
        })
        .then(function () {
          urlAgent1 = url1.replace(':id', 'agent1');
          urlAgent2 = util.normalizeURL(url2.replace(':id', 'agent2'));

          // connect and send a message
          conn1 = transport1.connect('agent1', function (from, message) {});
          assert.equal(conn1.url, urlAgent1);

          conn2 = transport2.connect('agent2', function (from, message) {});
          assert.equal(conn2.url, urlAgent2);

          return Promise.all([conn1.ready, conn2.ready])
        })
        .then(function () {
          return conn1.connect(urlAgent2);
        })
        .then(function () {
          assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
          assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

          // test list
          assert.deepEqual(transport1.agents[urlAgent1].list(), [urlAgent2]);
          assert.deepEqual(transport2.agents[urlAgent2].list(), [urlAgent1]);
        })
  });

  it('should send a message via an anonymous socket', function () {
    var url1;
    var transport1;
    var transport2;

    return Promise.all([freeport()])
        .then(function (ports) {
          url1 = 'ws://localhost:' + ports[0] + '/agents/:id';

          transport1 = new WebSocketTransport({url: url1});
          transport2 = new WebSocketTransport(); // no url, anonymous

          return Promise.all([transport1.ready, transport2.ready]);
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            var urlAgent1 = url1.replace(':id', 'agent1');

            // connect and send a message
            var conn1 = transport1.connect('agent1', function (from, message) {
              assert.equal(from, conn2.url);
              assert.equal(message, 'hi there');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [conn2.url]);

              // send a message back
              conn1.send(from, 'hello');
            });
            assert.equal(conn1.url, urlAgent1);

            var conn2 = transport2.connect('agent2', function (from, message) {
              assert.equal(from, urlAgent1);
              assert.equal(message, 'hello');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [conn2.url]);

              resolve();
            });
            //assert.ok(util.isUUID(conn2.url));
            assert.equal(conn2.url, 'agent2');

            Promise.all([conn1.ready, conn2.ready])
                .then(function () {
                  conn2.send(urlAgent1, 'hi there');
                });
          });
        });
  });

  // TODO: test sending with and without trailing url when sending a message

  it('should auto-reconnect a broken websocket connection', function () {
    var url1;
    var url2;
    var transport1;
    var transport2;
    var urlAgent1;
    var urlAgent2;
    var conn1;
    var conn2;

    return Promise.all([freeport(), freeport()])
        .then(function (ports) {
          url1 = 'ws://localhost:' + ports[0] + '/agents/:id';
          url2 = 'ws://localhost:' + ports[1] + '/agents/:id';

          urlAgent1 = url1.replace(':id', 'agent1');
          urlAgent2 = url2.replace(':id', 'agent2');

          transport1 = new WebSocketTransport({url: url1});
          transport2 = new WebSocketTransport({url: url2, reconnectDelay: 500});

          return Promise.all([transport1.ready, transport2.ready]);
        })
        .then(function () {
          return new Promise(function (resolve, reject) {

            // connect and send a message
            conn1 = transport1.connect('agent1', function (from, message) {
              assert.equal(from, urlAgent2);
              assert.equal(message, 'hi there');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

              resolve();
            });
            assert.equal(conn1.url, urlAgent1);

            conn2 = transport2.connect('agent2', function (from, message) {});
            assert.equal(conn2.url, urlAgent2);

            Promise.all([conn1.ready, conn2.ready])
                .then(function () {
                  return conn2.send(urlAgent1, 'hi there');
                });
          })
        })

        .then(function () {
          // close transport1
          transport1.close();
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            // give the socket some time to really close
            setTimeout(resolve, 100)
          });
        })
        .then(function () {
          assert.deepEqual(Object.keys(transport1.agents), []);
          assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

          // sending a message should fail now
          return conn2.send(urlAgent1, 'hi there')
        })
        .then(function() {
          assert.ok(false, 'huh? Sending message should not succeed');
        })
        .catch(function (err) {
          assert.equal(err.toString(), 'Error: Failed to connect to agent "' + urlAgent1 + '"')
        })

        // create transport1 again
        .then(function () {
          transport1 = new WebSocketTransport({url: url1});

          return transport1.ready;
        })
        .then(function () {
          return new Promise(function (resolve, reject) {
            // connect and send a message
            conn1 = transport1.connect('agent1', function (from, message) {
              assert.equal(from, urlAgent2);
              assert.equal(message, 'hello');

              assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
              assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

              resolve();
            });
            assert.equal(conn1.url, urlAgent1);

            conn1.ready.then(function () {
              return conn2.send(urlAgent1, 'hello');
            })
          });
        })

        // close down everything
        .then(function () {
          transport1.close();
          transport2.close();

          return new Promise(function (resolve, reject) {
            // give the socket some time to really close
            setTimeout(resolve, 100)
          });
        })
        .then(function () {
          assert.deepEqual(Object.keys(transport1.agents), []);
          assert.deepEqual(Object.keys(transport2.agents), []);
        });
  });

  // TODO: test error handling

  // TODO: test transport.close()

  it('should throw an error when agent is not found', function () {
    var transport = new WebSocketTransport({
      localShortcut: true
    });

    // connect and send a message
    var conn1 = transport.connect('ws://localhost:3000/agents/agent1', function (from, message) {});

    return conn1.send('ws://localhost:3000/agents/agentX', 'hi there')
        .then(function () {
          assert.ok(false, 'should not succeed sending message to disconnected agent1');
        })
        .catch(function(err) {
          assert.equal(err.toString(), 'Error: Failed to connect to agent "ws://localhost:3000/agents/agentX"');
        });
  });

  it('should correctly handle multiple messages', function () {
    var url1;
    var url2;
    var transport1;
    var transport2;

    return Promise.all([freeport(), freeport()])
      .then(function (ports) {
        url1 = 'ws://localhost:' + ports[0] + '/agents/:id';
        url2 = 'ws://localhost:' + ports[1] + '/agents/:id/';

        transport1 = new WebSocketTransport({url: url1});
        transport2 = new WebSocketTransport({url: url2});

        return Promise.all([transport1.ready, transport2.ready]);
      })
      .then(function () {
        return new Promise(function (resolve, reject) {
          var urlAgent1 = url1.replace(':id', 'agent1');
          var urlAgent2 = util.normalizeURL(url2.replace(':id', 'agent2'));

          // connect and send a message
          var conn1 = transport1.connect('agent1', function (from, message) {
            assert.equal(from, urlAgent2);
            assert.equal(message, 'hi there');

            assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
            assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

            // send a message back
            conn1.send(from, 'hello').done();
          });
          assert.equal(conn1.url, urlAgent1);

          var conn2 = transport2.connect('agent2', function (from, message) {
            assert.equal(from, urlAgent1);
            assert.equal(message, 'hello');

            assert.deepEqual(Object.keys(transport1.agents), [urlAgent1]);
            assert.deepEqual(Object.keys(transport2.agents), [urlAgent2]);

            resolve();
          });
          assert.equal(conn2.url, urlAgent2);

          Promise.all([conn1.ready, conn2.ready])
            .then(function () {
              conn2.send(urlAgent1, 'hi there').done();
              conn2.send(urlAgent1, 'hi there').done();
            });
        });
      });
  });

});
