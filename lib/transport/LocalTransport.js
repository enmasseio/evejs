var Promise = require('promise');
var Transport = require('./Transport');

/**
 * Create a local transport.
 * @constructor
 */
function LocalTransport() {
  this.peers = {};
}

LocalTransport.prototype = new Transport();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage                Invoked as onMessage(from, message)
 * @return {Promise.<LocalTransport, Error>} Returns a promise which resolves when
 *                                                connected.
 */
LocalTransport.prototype.connect = function connect (id, onMessage) {
  if (id in this.peers) {
    throw new Error('Peer with id ' + id + ' already exists');
  }

  this.peers[id] = onMessage;

  return Promise.resolve(this);
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
LocalTransport.prototype.disconnect = function disconnect (id) {
  delete this.peers[id];
};

/**
 * Send a message to a peer
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
LocalTransport.prototype.send = function send (from, to, message) {
  var callback = this.peers[to];
  if (!callback) {
    throw new Error('Peer with id ' + to + ' not found');
  }

  // invoke as callback(from, message)
  callback.apply(callback, [from].concat(Array.prototype.slice.call(arguments, 2)));
};

module.exports = LocalTransport;
