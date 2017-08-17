'use strict';

var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A local connection.
 * @param {DistribusTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function DistribusConnection(transport, id, receive) {
  this.transport = transport;
  this.id = id;

  // create a peer
  var peer = this.transport.host.create(id);
  peer.on('message', receive);

  // ready state
  this.ready = Promise.resolve(this);
}

DistribusConnection.prototype.getMyUrl = function(){
  return this.transport.type +":"+this.id;
};

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
DistribusConnection.prototype.send = function (to, message) {
  return this.transport.host.send(this.id, to, message);
};

/**
 * Close the connection
 */
DistribusConnection.prototype.close = function () {
  this.transport.host.remove(this.id);
};

module.exports = DistribusConnection;
