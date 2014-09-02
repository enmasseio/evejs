var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A local connection.
 * @param {LocalTransport} transport
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

  // TODO: better way needed to detect whether to is an url?
  var isURL = to.indexOf(':') !== -1;
  var toURL = isURL ? to : this.transport.remoteUrl.replace(':id', to);

  this.transport.send(fromURL, toURL, message);
};

/**
 * Close the connection
 */
HTTPConnection.prototype.close = function () {
  delete this.transport.agents[this.id];
};

module.exports = HTTPConnection;
