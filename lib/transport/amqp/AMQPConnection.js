var Connection = require('../Connection');

/**
 * A local connection.
 * @param {AMQPTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function AMQPConnection(transport, id, receive) {
  this.transport = transport;
  this.id = id;

  // ready state
  this.ready = this.transport._connect(id, receive);
}

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 */
AMQPConnection.prototype.send = function (to, message) {
  this.transport.exchange.publish(to, {
    body: {
      from: this.id,
      to: to,
      message: message
    }
  });
};

/**
 * Close the connection
 */
AMQPConnection.prototype.close = function () {
  this.transport._close(this.id);
};

module.exports = AMQPConnection;
