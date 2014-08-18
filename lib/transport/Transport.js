/**
 * Abstract prototype of a transport
 * @param {Object} [config]
 * @constructor
 */
function Transport(config) {}

Transport.prototype.type = null;

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive              Invoked as receive(from, message)
 * @return {Promise.<Transport, Error>}  Returns a promise which resolves when
 *                                        connected.
 */
Transport.prototype.connect = function(id, receive) {
  throw new Error('Cannot invoke abstract function "connect"');
};

/**
 * Disconnect an agent by its id
 * @param {String} id
 */
Transport.prototype.disconnect = function(id) {
  throw new Error('Cannot invoke abstract function "disconnect"');
};

/**
 * Send a message to an agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed agent
 * @param {String} message
 */
Transport.prototype.send = function(from, to, message) {
  throw new Error('Cannot invoke abstract function "send"');
};

module.exports = Transport;
