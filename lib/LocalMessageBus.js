/**
 * Create a local message bus.
 * @constructor
 */
function LocalMessageBus() {
  this.peers = {};
}

/**
 * register a peer
 * @param {String} id
 * @param {Function} onMessage    Invoked as onMessage(message [, data])
 * @param {Function} [onConnect]  Invoked when peer is connected, invoked as
 *                                onConnect()
 */
LocalMessageBus.prototype.register = function register (id, onMessage, onConnect) {
  if (id in this.peers) {
    throw new Error('Peer with id ' + id + ' already exists');
  }

  this.peers[id] = onMessage;

  // send connect callback
  if (onConnect) onConnect();
};

/**
 * Unregister a peer by its id
 * @param {String} id
 */
LocalMessageBus.prototype.unregister = function unregister (id) {
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
