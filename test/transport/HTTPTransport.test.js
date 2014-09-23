var assert = require('assert');
var HTTPTransport = require('../../lib/transport/http/HTTPTransport');

describe('HTTPTransport', function() {

  it.skip('should create an HTTPTransport with default settings', function () {
    var transport = new HTTPTransport();
    assert.ok(transport instanceof HTTPTransport);
    assert.equal(transport.type, 'local');
    assert.equal(transport.port, 3000);

    transport.close();
  });

  it.skip('should create an HTTPTransport with localShortcut==false', function () {
    var transport = new HTTPTransport({
      localShortcut: false
    });
    assert.equal(transport.localShortcut, false);

    transport.close();
  });

  // TODO: test HTTPTransport
});
