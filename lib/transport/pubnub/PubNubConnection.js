'use strict';

var Promise = require('promise');
var Connection = require('../Connection');

/**
 * A connection. The connection is ready when the property .ready resolves.
 * @param {PubNubTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */
function PubNubConnection(transport, id, receive) {
  this.id = id;
  this.transport = transport;

  // ready state
  var me = this;
  this.ready = new Promise(function (resolve, reject) {
    transport.pubnub.subscribe({
      channel: id,
      message: function (message) {
        receive(message.from, message.message);
      },
      connect: function () {
        resolve(me);
      }
    });
  });
}

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
PubNubConnection.prototype.send = function (to, message) {
  var me = this;
  return new Promise(function (resolve, reject) {
    me.transport.pubnub.publish({
      channel: to,
      message: {
        from: me.id,
        to: to,
        message: message
      },
      callback: resolve,
      error: reject
    });
  });
};

/**
 * Close the connection
 */
PubNubConnection.prototype.close = function () {
  this.transport.pubnub.unsubscribe({
    channel: this.id
  });
};

module.exports = PubNubConnection;
