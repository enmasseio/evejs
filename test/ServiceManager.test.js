var assert = require('assert');
var ServiceManager = require('../lib/ServiceManager');
var TransportManager = require('../lib/TransportManager');
var LocalTransport = require('../lib/transport/local/LocalTransport');
TransportManager.registerType(LocalTransport);

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

  it('should configure the timer', function () {
    var services = new ServiceManager({
      timer: {paced: true}
    });

    assert.deepEqual(services.timer.config(), {
      deterministic: true,
      master: null,
      paced: true,
      port: null,
      rate: 1,
      time: null
    });
  });

  it('should configure the random function', function () {
    var services = new ServiceManager({
      random: {deterministic: true}
    });

    assert(Math.abs(services.random() - 0.371365221591133) < 1e-14);
    assert(Math.abs(services.random() - 0.5421285164638114) < 1e-14);
    assert(Math.abs(services.random() - 0.9620605911694673) < 1e-14);
  });

  it('should configure the random function with custom seed', function () {
    var services = new ServiceManager({
      random: {
        deterministic: true,
        seed: 'myseed'
      }
    });

    assert(Math.abs(services.random() - 0.6667266603352634) < 1e-14);
    assert(Math.abs(services.random() - 0.6619975976892634) < 1e-14);
    assert(Math.abs(services.random() - 0.7065960127492606) < 1e-14);
  });

  // TODO: test init
  // TODO: test clear

});
