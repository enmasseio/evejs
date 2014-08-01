var Promise = require('promise');
var distribus = require('distribus');
var MessageBus = require('./MessageBus');

/**
 * Use distribus
 * @param {Object} config         Can contain an optional parameter `host`,
 *                                a distribus Host. If `host` is not provided,
 *                                a new local distribus Host is created.
 * @constructor
 */
function DistribusMessageBus(config) {
  this.host = config && config.host || new distribus.Host();

  /**
   * Send a message to a peer
   * @param {String} from    Id of sender
   * @param {String} to      Id of addressed peer
   * @param {String} message
   */
  this.send = this.host._send; // TODO: change this to this.host.send after next release of distribus
}

DistribusMessageBus.prototype = new MessageBus();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage                    Invoked as onMessage(from, message)
 * @return {Promise.<DistribusMessageBus, Error>} Returns a promise which resolves when
 *                                                connected.
 */
DistribusMessageBus.prototype.connect = function(id, onMessage) {
  // create a peer
  var peer = this.host.create(id);

  // register a listener
  peer.on('message', onMessage);

  return Promise.resolve(this);
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
DistribusMessageBus.prototype.disconnect = function(id) {
  this.host.remove(id);
};

module.exports = DistribusMessageBus;
