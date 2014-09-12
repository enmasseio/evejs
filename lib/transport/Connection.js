'use strict';

var Promise = require('promise');

/**
 * An abstract Transport connection
 * @param {Transport} transport
 * @param {string} id
 * @param {function} receive
 * @constructor
 * @abstract
 */
function Connection (transport, id, receive) {
  throw new Error('Cannot create an abstract Connection');
}

Connection.prototype.ready = Promise.reject(new Error('Cannot get abstract property ready'));

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 */
Connection.prototype.send = function (to, message) {
  throw new Error('Cannot call abstract function send');
};

/**
 * Close the connection, disconnect from the transport.
 */
Connection.prototype.close = function () {
  throw new Error('Cannot call abstract function "close"');
};

module.exports = Connection;
