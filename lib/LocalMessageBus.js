var MessageBus = require('./MessageBus');

/**
 * Create a local message bus.
 * @param {Object} config         Options. The LocalMessageBus has no options.
 * @param {function} [callback]   Optional callback called when the message bus
 *                                is ready.
 * @constructor
 */
function LocalMessageBus(config, callback) {
  this.peers = {};

  if (callback) callback();
}

LocalMessageBus.prototype = new MessageBus();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage    Invoked as onMessage(message [, data])
 * @param {Function} [onConnect]  Invoked when peer is connected, invoked as
 *                                onConnect()
 */
LocalMessageBus.prototype.connect = function connect (id, onMessage, onConnect) {
  if (id in this.peers) {
    throw new Error('Peer with id ' + id + ' already exists');
  }

  this.peers[id] = onMessage;

  // send connect callback
  if (onConnect) onConnect();
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
LocalMessageBus.prototype.disconnect = function disconnect (id) {
  delete this.peers[id];
};

/**
 * Send a message to a peer
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 * @param {*} [data]
 */
LocalMessageBus.prototype.send = function send (from, to, message, data) {
  var callback = this.peers[to];
  if (!callback) {
    throw new Error('Peer with id ' + to + ' not found');
  }

  // invoke as callback(from, message, data)
  callback.apply(callback, [from].concat(Array.prototype.slice.call(arguments, 2)));
};

module.exports = LocalMessageBus;
