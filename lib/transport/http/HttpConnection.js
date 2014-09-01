var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A local connection.
 * @param {LocalTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function HttpConnection(transport, id, receive) {
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
HttpConnection.prototype.send = function (to, message) {
  // TODO: detect if URL
  var fromURL = this.transport.url.replace(':id',this.id);
  var toURL = this.transport.remoteUrl.replace(':id',to);

  this.transport.send(fromURL, toURL, message);
};

/**
 * Close the connection
 */
HttpConnection.prototype.close = function () {
  delete this.transport.agents[this.id];
};

module.exports = HttpConnection;
