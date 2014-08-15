var assert = require('assert');
var ServiceManager = require('../lib/ServiceManager');
var TransportManager = require('../lib/TransportManager');

describe('ServiceManager', function() {

  it('should create a service manager', function () {
    var services = new ServiceManager();

    assert(services.transports instanceof TransportManager);
  });

  it('should create a service manager with config', function () {
    var services = new ServiceManager({
      transports: [
        {type: 'local'}
      ]
    });

    assert.equal(services.transports.transports.length, 1);
  });

});
