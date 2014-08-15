var AMQPTransport = require('./transport/AMQPTransport');
var DistribusTransport = require('./transport/DistribusTransport');
var LocalTransport = require('./transport/LocalTransport');
var PubNubTransport = require('./transport/PubNubTransport');

/**
 * A manager for loading and finding transports.
 * @constructor
 */
function ServiceManager() {
  this.types = {};
  this.transports = [];

  this.registerTransportType(AMQPTransport);
  this.registerTransportType(DistribusTransport);
  this.registerTransportType(LocalTransport);
  this.registerTransportType(PubNubTransport);
}

/**
 * Register a new type of transport. This transport can then be loaded via
 * configuration.
 * @param {Transport.prototype} constructor     A transport constructor
 */
ServiceManager.prototype.registerTransportType = function (constructor) {
  var type = constructor.prototype.type;
  if (!type) {
    throw new Error('Field "prototype.type" missing in transport constructor');
  }
  if (type in this.types) {
    throw new Error('Transport type "' + type + '" already exists');
  }

  this.types[type] = constructor;
};

/**
 * Add a loaded transport to the manager
 * @param {Transport} transport
 */
ServiceManager.prototype.addTransport = function (transport) {
  this.transports.push(transport);
};

/**
 * Load a transport based on JSON configuration
 * @param {Object} config
 */
ServiceManager.prototype.loadTransport = function (config) {
  var type = config.type;
  if (!type) {
    throw new Error('Property "type" missing');
  }

  var constructor = this.types[type];
  if (!constructor) {
    throw new Error('Unknown type of transport "' + type + '". ' +
        'Choose from: ' + Object.keys(this.types).join(','))
  }

  var transport = new constructor(config);
  this.transports.push(transport);
};

/**
 * Get a transport. Throws an error when no matching transport is found
 * @param {string} [type]   Type of the transport. Choose from 'amqp',
 *                          'distribus', 'local', 'pubnub'.
 * @return {Transport}      When type is defined, the first transport of this
 *                          type is returned. When undefined, the first loaded
 *                          transport of any type is returned
 */
ServiceManager.prototype.getTransport = function (type) {
  var transport = this.getTransports(type)[0];
  if (!transport) {
    throw new Error('No transport found');
  }
  return transport;
};

/**
 * Get transports.
 * @param {string} [type]   Type of the transport. Choose from 'amqp',
 *                          'distribus', 'local', 'pubnub'.
 * @return {Transport[]}    When type is defined, the all transports of this
 *                          type are returned. When undefined, all transports
 *                          are returned.
 */
ServiceManager.prototype.getTransports = function (type) {
  if (type) {
    if (!(type in this.types)) {
      throw new Error('Unknown type of transport "' + type + '". ' +
          'Choose from: ' + Object.keys(this.types).join(','))
    }

    return this.transports.filter(function (transport) {
      return transport.type === type;
    });
  }
  else {
    return [].concat(this.transports);
  }
};


module.exports = ServiceManager;
