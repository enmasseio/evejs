var assert = require('assert');
var TransportManager = require('../lib/TransportManager');
var Transport = require('../lib/transport/Transport');
var LocalTransport = require('../lib/transport/local/LocalTransport');
var DistribusTransport = require('../lib/transport/distribus/DistribusTransport');

describe('TransportManager', function() {

  it('should create a transport manager', function () {
    var manager = new TransportManager();

    assert.deepEqual(Object.keys(manager.types).sort(), ['amqp', 'distribus', 'http', 'local', 'pubnub']);
    assert.deepEqual(manager.transports, []);
  });

  it('should register a new transport type', function () {
    var manager = new TransportManager();

    function TestTransport () {

    }

    TestTransport.prototype = new Transport();
    TestTransport.prototype.type = 'test';

    manager.registerType(TestTransport);

    assert.deepEqual(Object.keys(manager.types).sort(), ['amqp', 'distribus', 'http', 'local', 'pubnub', 'test'])
  });

  it('should throw an error when registering an already existing transport type', function () {
    var manager = new TransportManager();

    function TestTransport () {

    }

    TestTransport.prototype = new Transport();
    TestTransport.prototype.type = 'local';

    assert.throws(function () {
      manager.registerType(TestTransport);
    }, /already exists/);
  });

  it('should add a loaded transport', function () {
    var manager = new TransportManager();

    var local = new LocalTransport();

    manager.add(local);

    assert.equal(manager.transports.length, 1);
    assert.strictEqual(manager.transports[0], local);
  });

  it('should load a transport from config', function () {
    var manager = new TransportManager();

    manager.load({type: 'local'});

    assert.equal(manager.transports.length, 1);
    assert(manager.transports[0] instanceof LocalTransport);
  });

  it('should load a transport manager with config object', function () {
    var manager = new TransportManager([
      {type: 'local'},
      {type: 'distribus'},
      {type: 'local'}
    ]);

    assert.equal(manager.transports.length, 3);
    assert(manager.transports[0] instanceof LocalTransport);
    assert(manager.transports[1] instanceof DistribusTransport);
    assert(manager.transports[2] instanceof LocalTransport);
  });

  it('should find all transports', function () {
    var manager = new TransportManager();

    manager.add(new DistribusTransport());
    manager.add(new LocalTransport());
    manager.add(new LocalTransport());
    manager.add(new DistribusTransport());

    var transports = manager.getByType();
    assert.equal(transports.length, 4);
    assert(transports[0] instanceof DistribusTransport);
    assert(transports[1] instanceof LocalTransport);
    assert(transports[2] instanceof LocalTransport);
    assert(transports[3] instanceof DistribusTransport);
  });

  it('should find a transport by id', function () {
    var manager = new TransportManager();

    var d = new DistribusTransport({id: 'mydistribus'});
    manager.add(new LocalTransport());
    manager.add(d);
    manager.add(new LocalTransport());
    manager.add(new DistribusTransport());

    var transport = manager.get('mydistribus');
    assert.strictEqual(transport, d);
  });

  it('should throw an error when a transport could not be found', function () {
    var manager = new TransportManager();

    assert.throws(function () {
      manager.get('nonexisting');
    }, /not found/);
  });

  it('should find all transports by type', function () {
    var manager = new TransportManager();

    manager.add(new DistribusTransport());
    manager.add(new LocalTransport());
    manager.add(new LocalTransport());
    manager.add(new DistribusTransport());

    var transports = manager.getByType('local');
    assert.equal(transports.length, 2);
    assert(transports[0] instanceof LocalTransport);
    assert(transports[1] instanceof LocalTransport);

    var transports2 = manager.getByType('amqp');
    assert.equal(transports2.length, 0);
  });

  it('should throw an error when finding an unknown type of transport', function () {
    var manager = new TransportManager();

    assert.throws(function () {
      manager.getByType('foo');
    }, /Unknown type/);
  });

  // TODO: test load
  // TODO: test clear

});
