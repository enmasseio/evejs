'use strict';

var Promise = require('promise');
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
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
AMQPConnection.prototype.send = function (to, message) {
  var me = this;
  return new Promise(function (resolve, reject) {
    var msg = {
      body: {
        from: me.id,
        to: to,
        message: message
      }
    };
    var options = {
      //immediate: true
    };

    me.transport.exchange.publish(to, msg, options, function () {
      // FIXME: callback is not called. See https://github.com/postwait/node-amqp#exchangepublishroutingkey-message-options-callback
      //console.log('sent', arguments)
    });

    resolve();
  });
};

/**
 * Close the connection
 */
AMQPConnection.prototype.close = function () {
  this.transport._close(this.id);
};

module.exports = AMQPConnection;
