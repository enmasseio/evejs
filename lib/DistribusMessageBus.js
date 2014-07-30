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
   * @param {*} [data]
   */
  this.send = this.host._send;
}

DistribusMessageBus.prototype = new MessageBus();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage    Invoked as onMessage(message [, data])
 * @param {Function} [onConnect]  Invoked when peer is connected, invoked as
 *                                onConnect()
 */
DistribusMessageBus.prototype.connect = function(id, onMessage, onConnect) {
  // create a peer
  var peer = this.host.create(id);

  // register a listener
  peer.on('message', onMessage);

  // invoke callback
  if (onConnect) onConnect();
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
DistribusMessageBus.prototype.disconnect = function(id) {
  this.host.remove(id);
};

module.exports = DistribusMessageBus;
