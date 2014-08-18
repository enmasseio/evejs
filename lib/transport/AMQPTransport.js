var Promise = require('promise');
var Transport = require('./Transport');

/**
 * Use AMQP as transport
 * @param {Object} config   Must contain properties `url` or `host`, for example
 *                          {url: 'amqp://localhost'} or {host: 'dev.rabbitmq.com'}
 * @constructor
 */
function AMQPMessageBus(config) {
  this.config = config;
  this.connection = null;
  this.exchange = null;

  this.subscriptions = [];
}

AMQPMessageBus.prototype = new Transport();

AMQPMessageBus.prototype.type = 'amqp';

/**
 * Get an AMQP connection. If there is not yet a connection, a connection will
 * be made.
 * @param {Function} callback   Invoked as callback(connection)
 * @private
 */
AMQPMessageBus.prototype._getConnection = function(callback) {
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
 * Connect an agent
 * @param {String} id
 * @param {Function} receive                  Invoked as receive(from, message)
 * @return {Promise.<AMQPMessageBus, Error>}  Returns a promise which resolves when
 *                                            connected.
 */
AMQPMessageBus.prototype.connect = function(id, receive) {
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
 * Disconnect an agent by its id
 * @param {String} id
 */
AMQPMessageBus.prototype.disconnect = function(id) {
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

/**
 * Send a message to an agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed agent
 * @param {String} message
 */
AMQPMessageBus.prototype.send = function(from, to, message) {
  this.exchange.publish(to, {
    body: {
      from: from,
      to: to,
      message: message
    }
  });
};

module.exports = AMQPMessageBus;
