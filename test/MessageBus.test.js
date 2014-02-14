var assert = require('assert'),
    MessageBus = require('../lib/MessageBus');

describe('MessageBus', function() {

  it('should create a MessageBus', function () {
    var bus = new MessageBus();
    assert.ok(bus instanceof MessageBus);
  });

  it('should register and unregister to MessageBus', function () {
    var bus = new MessageBus();
    var count = 0;

    // register and send a message
    bus.register('peer1', function (from, message) {
      assert.equal(from, 'peer2');
      assert.equal(message, 'hi there');
      count++;
    });

    bus.send('peer2', 'peer1', 'hi there');
    assert.equal(count, 1);

    // unregister
    bus.unregister('peer1');
    assert.throws (function () {
      bus.send('peer2', 'peer1', 'hi there');
    }, /Error: Peer with id peer1 not found/);
  });

});
