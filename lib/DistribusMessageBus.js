var distribus = require('distribus');
var MessageBus = require('./MessageBus');

/**
 * Use distribus
 * @param {Object} config         Can contain options `address` and `port` to
 *                                create a Host listening on the configured port
 * @param {function} [callback]   Optional callback called when the message bus
 *                                is ready.
 * @constructor
 */
function DistribusMessageBus(config, callback) {
  this.host = new distribus.Host();

  /**
   * Send a message to a peer
   * @param {String} from    Id of sender
   * @param {String} to      Id of addressed peer
   * @param {String} message
   * @param {*} [data]
   */
  this.send = this.host._send;

  if (config && config.port) {
    this.host
        .listen(config.address || 'localhost', config.port)
        .then(callback);
  }
  else {
    if (callback) callback();
  }
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

/**
 * Join another distribus host
 * @param {String} url
 */
DistribusMessageBus.prototype.join = function(url) {
  this.host.join(url);
};

module.exports = DistribusMessageBus;
