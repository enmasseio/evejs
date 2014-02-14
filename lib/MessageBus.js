/**
 * Abstract prototype of a message bus.
 * @constructor
 */
function MessageBus(config) {}

/**
 * connect a peer
 * @param {String} id
 * @param {Function} onMessage    Invoked as onMessage(message [, data])
 * @param {Function} [onConnect]  Invoked when peer is connected, invoked as
 *                                onConnect()
 */
MessageBus.prototype.connect = function connect (id, onMessage, onConnect) {
  throw new Error('Cannot invoke abstract function "connect"');
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
MessageBus.prototype.disconnect = function disconnect (id) {
  throw new Error('Cannot invoke abstract function "disconnect"');
};

/**
 * Send a message to a peer
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 * @param {*} [data]
 */
MessageBus.prototype.send = function send (from, to, message, data) {
  throw new Error('Cannot invoke abstract function "send"');
};

module.exports = MessageBus;
