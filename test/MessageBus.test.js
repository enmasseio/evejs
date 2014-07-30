var assert = require('assert');
var LocalMessageBus = require('../lib/LocalMessageBus');

describe('LocalMessageBus', function() {

  it('should create a LocalMessageBus', function () {
    var bus = new LocalMessageBus();
    assert.ok(bus instanceof LocalMessageBus);
  });

  it('should connect and disconnect to LocalMessageBus', function () {
    var bus = new LocalMessageBus();
    var count = 0;

    // connect and send a message
    bus.connect('peer1', function (from, message) {
      assert.equal(from, 'peer2');
      assert.equal(message, 'hi there');
      count++;
    });

    bus.send('peer2', 'peer1', 'hi there');
    assert.equal(count, 1);

    // disconnect
    bus.disconnect('peer1');
    assert.throws (function () {
      bus.send('peer2', 'peer1', 'hi there');
    }, /Error: Peer with id peer1 not found/);
  });

});
