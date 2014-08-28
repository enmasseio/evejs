var AMQPTransport = require('./transport/amqp/AMQPTransport');
var DistribusTransport = require('./transport/distribus/DistribusTransport');
var LocalTransport = require('./transport/local/LocalTransport');
var PubNubTransport = require('./transport/pubnub/PubNubTransport');

/**
 * A manager for loading and finding transports.
 * @param {Array} [config]      Optional array containing configuration objects
 *                             for transports.
 * @constructor
 */
function TransportManager(config) {
  this.types = {};
  this.transports = [];

  this.registerType(AMQPTransport);
  this.registerType(DistribusTransport);
  this.registerType(LocalTransport);
  this.registerType(PubNubTransport);

  if (config) {
    this.load(config);
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
 * Load one or multiple transports based on JSON configuration
 * @param {Object | Array} config
 * @return {Transport | Transport[]} Returns the loaded transport(s)
 */
TransportManager.prototype.load = function (config) {
  if (Array.isArray(config)) {
    return config.map(this.load.bind(this));
  }

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
 * Find transports by type.
 * @param {string} [type]   Type of the transport. Choose from 'amqp',
 *                          'distribus', 'local', 'pubnub'.
 * @return {Transport[]}    When type is defined, the all transports of this
 *                          type are returned. When undefined, all transports
 *                          are returned.
 */
TransportManager.prototype.getByType = function (type) {
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

/**
 * Clear all configured transports
 */
TransportManager.prototype.clear = function () {
  // TODO: close all open connections on all transports
  this.transports = [];
};

module.exports = TransportManager;
