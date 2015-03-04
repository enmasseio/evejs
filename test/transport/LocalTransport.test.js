var assert = require('assert');
var LocalTransport = require('../../lib/transport/local/LocalTransport');
var Promise = require('promise');

describe('LocalTransport', function() {

  it('should create a LocalTransport', function () {
    var transport = new LocalTransport();
    assert.ok(transport instanceof LocalTransport);
    assert.equal(transport.type, 'local');
  });

  it('should create a LocalTransport with id', function () {
    var transport = new LocalTransport({id: 'foo'});
    assert.ok(transport instanceof LocalTransport);
    assert.equal(transport.type, 'local');
    assert.equal(transport.id, 'foo');
  });

  it('should connect and disconnect to LocalTransport', function () {
    var transport = new LocalTransport();
    var count = 0;

    // connect and send a message
    var conn1 = transport.connect('agent1', function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hi there');
      count++;
    });

    var conn2 = transport.connect('agent2', function (from, message) {
    });

    var res = conn2.send('agent1', 'hi there');
    assert.equal(count, 1);
    assert(res instanceof Promise); // send should return a promise

    // disconnect
    conn1.close();
    return new Promise(function (resolve, reject) {
      conn2.send('agent1', 'hi there').catch(function (err) {
        try {
          assert.equal(err.message,'Agent with id agent1 not found');
          resolve();
        }
        catch (err) {
          reject(err);
        }
      });
    });
  });

});
