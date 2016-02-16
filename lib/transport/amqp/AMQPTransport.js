'use strict';

var Promise = require('promise');
var Transport = require('./../Transport');
var AMQP = require('amqplib/callback_api');
var AMQPConnection = require('./AMQPConnection');

/**
 * Use AMQP as transport
 * @param {Object} config   Config can contain the following properties:
 *                          - `id: string`
 *                          - `url: string`
 *                          - `host: string`
 *                          The config must contain either `url` or `host`.
 *                          For example: {url: 'amqp://localhost'} or
 *                          {host: 'dev.rabbitmq.com'}
 * @constructor
 */
function AMQPTransport(config) {
  this.id = config.id || null;
  this.url = config.url || (config.host && "amqp://" + config.host) || null;
  this['default'] = config['default'] || false;

  this.networkId = this.url;
  this.connection = null;
  this.config = config;
}

AMQPTransport.prototype = new Transport();
AMQPTransport.prototype.type = 'amqp';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive     Invoked as receive(from, message)
 * @return {AMQPConnection} Returns a connection.
 */
AMQPTransport.prototype.connect = function (id, receive) {
  var me = this;
  var ready = new Promise(function (resolve, reject) {
    if (me.connection == null) {
      AMQP.connect(me.url, function (err, conn) {
        if (err != null) {
          console.error(err);
        } else {
          me.connection = conn;
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
  return new AMQPConnection(me, id, receive, ready);
};

/**
 * Close the transport.
 */
AMQPTransport.prototype.close = function () {
  if (this.connection != null) {
    this.connection.close();
    this.connection = null;
  }
};

module.exports = AMQPTransport;
