'use strict';

var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A local connection.
 * @param {LocalTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function LocalConnection(transport, id, receive) {
  this.transport = transport;
  this.id = id;

  // register the agents receive function
  if (this.id in this.transport.agents) {
    throw new Error('Agent with id ' + id + ' already exists');
  }
  this.transport.agents[this.id] = receive;

  // ready state
  this.ready = Promise.resolve(this);
}

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 */
LocalConnection.prototype.send = function (to, message) {
  var callback = this.transport.agents[to];
  if (!callback) {
    throw new Error('Agent with id ' + to + ' not found');
  }

  // invoke the agents receiver as callback(from, message)
  callback(this.id, message);
};

/**
 * Close the connection
 */
LocalConnection.prototype.close = function () {
  delete this.transport.agents[this.id];
};

module.exports = LocalConnection;
