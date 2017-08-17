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
function AMQPConnection(transport, id, receive, connReady) {
  this.transport = transport;
  this.id = id;
  this.channel = null;

  var me = this;
  this.ready = new Promise(function (resolve, reject) {
    connReady.then(function () {
      me.transport.connection.createChannel(function (err, ch) {
        if (err != null) {
          console.error(err);
          reject();
        } else {
          me.channel = ch;
          ch.assertQueue(me.id);
          ch.consume(me.id, function (message) {
              if (message !== null && message.content && message.content.toString() != "") {
                var body = JSON.parse(message.content.toString());
                if (body.to != me.id) {
                  console.warn("Received message not meant for me?", body);
                } else {
                  receive(body.from, body.message);
                }
                ch.ack(message);
              }
            }
          );
          resolve();
        }
      });
    });
  })
}

AMQPConnection.prototype.getMyUrl = function(){
  return this.transport.type +":"+this.id;
};

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
AMQPConnection.prototype.send = function (to, message) {
  if (this.channel != null) {
    var msg = {
      from: this.id,
      to: to,
      message: message
    };
    this.channel.sendToQueue(to, new Buffer(JSON.stringify(msg), "utf-8"));
  } else {
    console.log("No channel open");
  }
};

/**
 * Close the connection
 */
AMQPConnection.prototype.close = function () {
  if (this.channel != null) {
    this.channel.close();
  }
  this.channel = null;
};

module.exports = AMQPConnection;
