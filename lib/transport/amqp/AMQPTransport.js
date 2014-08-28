var Promise = require('promise');
var Transport = require('./../Transport');
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
  this.id = config && config.id || null;
  this.config = config;
  this.connection = null;
  this.exchange = null;

  this.subscriptions = [];
}

AMQPTransport.prototype = new Transport();

AMQPTransport.prototype.type = 'amqp';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive     Invoked as receive(from, message)
 * @return {AMQPConnection} Returns a connection.
 */
AMQPTransport.prototype.connect = function(id, receive) {
  return new AMQPConnection(this, id, receive);
};

/**
 * Get an AMQP connection. If there is not yet a connection, a connection will
 * be made.
 * @param {Function} callback   Invoked as callback(connection)
 * @private
 */
AMQPTransport.prototype._getConnection = function(callback) {
  var me = this;

  if (this.connection) {
    // connection is available
    callback(this.connection);
  }
  else {
    if (this._onConnected) {
      // connection is being opened but not yet ready
      this._onConnected.push(callback);
    }
    else {
      // no connection, create one
      this._onConnected = [callback];

      var amqp = require('amqp');   // lazy load the amqp library
      var connection = amqp.createConnection(this.config);
      connection.on('ready', function () {
        var exchange = connection.exchange('', {}, function () {
          var _onConnected = me._onConnected;
          delete me._onConnected;

          me.connection = connection;
          me.exchange = exchange;

          _onConnected.forEach(function (callback) {
            callback(me.connection);
          });
        });
      });
    }
  }
};

/**
 * Open a connection
 * @param {string} id
 * @param {Function} receive     Invoked as receive(from, message)
 */
AMQPTransport.prototype._connect = function(id, receive) {
  var me = this;

  return new Promise(function (resolve, reject) {
    function subscribe(connection) {
      var queue = connection.queue(id, {}, function() {
        queue
            .subscribe(function(message) {
              var body = message.body;
              receive(body.from, body.message);
            })
            .addCallback(function (ok) {
              // register this subscription
              me.subscriptions.push({
                id: id,
                consumerTag: ok.consumerTag
              });

              resolve(me);
            });
      });
    }

    me._getConnection(subscribe);
  });
};

/**
 * Close a connection an agent by its id
 * @param {String} id
 */
AMQPTransport.prototype._close = function(id) {
  var i = 0;
  while (i < this.subscriptions.length) {
    var subscription = this.subscriptions[i];
    if (subscription.id == id) {
      // remove this entry
      this.subscriptions.splice(i, 1);
    }
    else {
      i++;
    }
  }

  if (this.subscriptions.length == 0) {
    // fully disconnect if there are no subscribers left
    this.exchange.destroy();
    this.connection.disconnect();

    this.connection = null;
    this.exchange = null;
  }
};

module.exports = AMQPTransport;
