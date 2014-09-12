'use strict';

/**
 * Abstract prototype of a transport
 * @param {Object} [config]
 * @constructor
 */
function Transport(config) {
  this.id = config && config.id || null;
  this['default'] = config && config['default'] || false;
}

Transport.prototype.type = null;

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive  Invoked as receive(from, message)
 * @return {Connection}       Returns a connection
 */
Transport.prototype.connect = function(id, receive) {
  throw new Error('Cannot invoke abstract function "connect"');
};

module.exports = Transport;
