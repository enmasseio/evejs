var assert = require('assert');
var ServiceManager = require('../lib/ServiceManager');
var Transport = require('../lib/transport/Transport');
var LocalTransport = require('../lib/transport/LocalTransport');
var DistribusTransport = require('../lib/transport/DistribusTransport');

describe('ServiceManager', function() {

  it('should create a service manager', function () {
    var manager = new ServiceManager();

    assert.deepEqual(Object.keys(manager.types).sort(), ['amqp', 'distribus', 'local', 'pubnub']);
    assert.deepEqual(manager.transports, []);
  });

  it('should register a new transport type', function () {
    var manager = new ServiceManager();

    function TestTransport () {

    }

    TestTransport.prototype = new Transport();
    TestTransport.prototype.type = 'test';

    manager.registerTransportType(TestTransport);

    assert.deepEqual(Object.keys(manager.types).sort(), ['amqp', 'distribus', 'local', 'pubnub', 'test'])
  });

  it('should throw an error when registering an already existing transport type', function () {
    var manager = new ServiceManager();

    function TestTransport () {

    }

    TestTransport.prototype = new Transport();
    TestTransport.prototype.type = 'local';

    assert.throws(function () {
      manager.registerTransportType(TestTransport);
    }, /already exists/);
  });

  it('should add a loaded transport', function () {
    var manager = new ServiceManager();

    var local = new LocalTransport();

    manager.addTransport(local);

    assert.equal(manager.transports.length, 1);
    assert.strictEqual(manager.transports[0], local);
  });

  it('should load a transport from config', function () {
    var manager = new ServiceManager();

    manager.loadTransport({type: 'local'});

    assert.equal(manager.transports.length, 1);
    assert(manager.transports[0] instanceof LocalTransport);
  });

  it('should find all transports', function () {
    var manager = new ServiceManager();

    manager.addTransport(new DistribusTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new DistribusTransport());

    var transports = manager.getTransports();
    assert.equal(transports.length, 4);
    assert(transports[0] instanceof DistribusTransport);
    assert(transports[1] instanceof LocalTransport);
    assert(transports[2] instanceof LocalTransport);
    assert(transports[3] instanceof DistribusTransport);
  });

  it('should find all transports by type', function () {
    var manager = new ServiceManager();

    manager.addTransport(new DistribusTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new DistribusTransport());

    var transports = manager.getTransports('local');
    assert.equal(transports.length, 2);
    assert(transports[0] instanceof LocalTransport);
    assert(transports[1] instanceof LocalTransport);

    var transports2 = manager.getTransports('amqp');
    assert.equal(transports2.length, 0);
  });

  it('should find all transports by type', function () {
    var manager = new ServiceManager();

    manager.addTransport(new DistribusTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new DistribusTransport());

    var transports = manager.getTransports('local');
    assert.equal(transports.length, 2);
    assert(transports[0] instanceof LocalTransport);
    assert(transports[1] instanceof LocalTransport);
  });

  it('should throw an error when finding an unknown type of transport', function () {
    var manager = new ServiceManager();

    assert.throws(function () {
      manager.getTransports('foo');
    }, /Unknown type/);
  });

  it('should find a single transport', function () {
    var manager = new ServiceManager();

    manager.addTransport(new DistribusTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new LocalTransport());

    var transport = manager.getTransport();
    assert(transport instanceof DistribusTransport);
  });

  it('should find a single transport by type', function () {
    var manager = new ServiceManager();

    manager.addTransport(new DistribusTransport());
    manager.addTransport(new LocalTransport());
    manager.addTransport(new DistribusTransport());

    var transport = manager.getTransport('local');
    assert(transport instanceof LocalTransport);
  });

  it('should throw an error when a no transport is found', function () {
    var manager = new ServiceManager();

    assert.throws(function () {
      manager.getTransport();
    }, /No transport found/);

    assert.throws(function () {
      manager.getTransport('local');
    }, /No transport found/);
  });

});
