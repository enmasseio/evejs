var AMQPTransport = require('./transport/AMQPTransport');
var DistribusTransport = require('./transport/DistribusTransport');
var LocalTransport = require('./transport/LocalTransport');
var PubNubTransport = require('./transport/PubNubTransport');

/**
 * A manager for loading and finding transports.
 * @param {Object} config     Optional JSON configuration to load one or
 *                            multiple transports. Available fields:
 *                            - `transports: Array` An array containing
 *                              configuration objects for transports.
 * @constructor
 */
function ServiceManager(config) {
  this.transportTypes = {};
  this.transports = [];

  this.registerTransportType(AMQPTransport);
  this.registerTransportType(DistribusTransport);
  this.registerTransportType(LocalTransport);
  this.registerTransportType(PubNubTransport);

  if (config) {
    if (config.transports) {
      config.transports.forEach(this.loadTransport.bind(this))
    }
  }
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
  if (type in this.transportTypes) {
    throw new Error('Transport type "' + type + '" already exists');
  }

  this.transportTypes[type] = constructor;
};

/**
 * Add a loaded transport to the manager
 * @param {Transport} transport
 * @return {Transport} returns the transport itself
 */
ServiceManager.prototype.addTransport = function (transport) {
  this.transports.push(transport);
  return transport;
};

/**
 * Load a transport based on JSON configuration
 * @param {Object} config
 * @return {Transport} Returns the loaded transport
 */
ServiceManager.prototype.loadTransport = function (config) {
  var type = config.type;
  if (!type) {
    throw new Error('Property "type" missing');
  }

  var constructor = this.transportTypes[type];
  if (!constructor) {
    throw new Error('Unknown type of transport "' + type + '". ' +
        'Choose from: ' + Object.keys(this.transportTypes).join(','))
  }

  var transport = new constructor(config);
  this.transports.push(transport);

  return transport;
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
    if (!(type in this.transportTypes)) {
      throw new Error('Unknown type of transport "' + type + '". ' +
          'Choose from: ' + Object.keys(this.transportTypes).join(','))
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
