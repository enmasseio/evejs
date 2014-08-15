var AMQPTransport = require('./transport/AMQPTransport');
var DistribusTransport = require('./transport/DistribusTransport');
var LocalTransport = require('./transport/LocalTransport');
var PubNubTransport = require('./transport/PubNubTransport');

/**
 * A manager for loading and finding transports.
 * @param {Array} [transports] Optional array containing configuration objects
 *                             for transports.
 * @constructor
 */
function TransportManager(transports) {
  this.types = {};
  this.transports = [];

  this.registerType(AMQPTransport);
  this.registerType(DistribusTransport);
  this.registerType(LocalTransport);
  this.registerType(PubNubTransport);

  if (transports) {
    transports.forEach(this.load.bind(this))
  }
}

/**
 * Register a new type of transport. This transport can then be loaded via
 * configuration.
 * @param {Transport.prototype} constructor     A transport constructor
 */
TransportManager.prototype.registerType = function (constructor) {
  var type = constructor.prototype.type;
  if (typeof constructor !== 'function') {
    throw new Error('Constructor function expected');
  }
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
 * @return {Transport} returns the transport itself
 */
TransportManager.prototype.add = function (transport) {
  this.transports.push(transport);
  return transport;
};

/**
 * Load a transport based on JSON configuration
 * @param {Object} config
 * @return {Transport} Returns the loaded transport
 */
TransportManager.prototype.load = function (config) {
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

  return transport;
};

/**
 * Get a single transport. Throws an error when no matching transport is found
 * @param {string} [type]   Type of the transport. Choose from 'amqp',
 *                          'distribus', 'local', 'pubnub'.
 * @return {Transport}      When type is defined, the first transport of this
 *                          type is returned. When undefined, the first loaded
 *                          transport of any type is returned
 */
TransportManager.prototype.getOne = function (type) {
  var transport = this.get(type)[0];
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
TransportManager.prototype.get = function (type) {
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

module.exports = TransportManager;
