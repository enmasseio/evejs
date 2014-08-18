var assert = require('assert');
var LocalTransport = require('../../lib/transport/LocalTransport');

describe('LocalTransport', function() {

  it('should create a LocalTransport', function () {
    var transport = new LocalTransport();
    assert.ok(transport instanceof LocalTransport);
    assert.equal(transport.type, 'local');
  });

  it('should connect and disconnect to LocalTransport', function () {
    var transport = new LocalTransport();
    var count = 0;

    // connect and send a message
    transport.connect('agent1', function (from, message) {
      assert.equal(from, 'agent2');
      assert.equal(message, 'hi there');
      count++;
    });

    transport.send('agent2', 'agent1', 'hi there');
    assert.equal(count, 1);

    // disconnect
    transport.disconnect('agent1');
    assert.throws (function () {
      transport.send('agent2', 'agent1', 'hi there');
    }, /Error: Agent with id agent1 not found/);
  });

});
