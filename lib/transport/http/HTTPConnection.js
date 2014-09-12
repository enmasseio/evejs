'use strict';

var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A HTTP connection.
 * @param {HTTPTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function HTTPConnection(transport, id, receive) {
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
HTTPConnection.prototype.send = function (to, message) {
  var fromURL = this.transport.url.replace(':id', this.id);

  var isURL = to.indexOf('://');
  var toURL;
  if (isURL != -1) {
    toURL = to;
  }
  else {
    if (this.transport.remoteUrl !== undefined) {
      toURL = this.transport.remoteUrl.replace(':id', to);
    }
    else {
      console.log("ERROR: no remote URL specified. Cannot send over HTTP.", to);
    }
  }

  var receive = this.transport.agents[this.id];
  this.transport.send(fromURL, toURL, message, receive);
};

/**
 * Close the connection
 */
HTTPConnection.prototype.close = function () {
  delete this.transport.agents[this.id];
};

module.exports = HTTPConnection;
