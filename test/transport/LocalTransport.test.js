var assert = require('assert');
var LocalTransport = require('../../lib/transport/LocalTransport');

describe('LocalTransport', function() {

  it('should create a LocalTransport', function () {
    var transport = new LocalTransport();
    assert.ok(transport instanceof LocalTransport);
  });

  it('should connect and disconnect to LocalTransport', function () {
    var transport = new LocalTransport();
    var count = 0;

    // connect and send a message
    transport.connect('peer1', function (from, message) {
      assert.equal(from, 'peer2');
      assert.equal(message, 'hi there');
      count++;
    });

    transport.send('peer2', 'peer1', 'hi there');
    assert.equal(count, 1);

    // disconnect
    transport.disconnect('peer1');
    assert.throws (function () {
      transport.send('peer2', 'peer1', 'hi there');
    }, /Error: Peer with id peer1 not found/);
  });

});
