var uuid = require('node-uuid');

/**
 * Actor
 * @param {String} [id] Id for the actor. If not provided, the actor will be
 *                      given a uuid.
 * @constructor
 */
function Actor (id) {
  this.id = id ? id.toString() : uuid.v4();
  this.listeners = [];
  this.connections = [];
}

/**
 * Send a message to an actor
 * @param {String} to       Id of the actor
 * @param {String} message  Message to be send
 */
Actor.prototype.send = function send(to, message) {
  // TODO: this send method should be reworked. Remove overhead as much as possible
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];

    // TODO: send should only try a next connection when a connection failed because the peer was not found
    try {
      connection.messagebus.send(this.id, to, message);

      // break if successful
      break;
    }
    catch (err) {
      if (i == ii - 1) {
        // all connections failed. Rethrow the error
        throw err;
      }
    }
  }
};

/**
 * Receive a message.
 * All listeners will be checked against their patterns, and if there is a
 * match, the listeners callback function is invoked.
 * @param {String} from     Id of sender
 * @param {String} message  Received message
 */
Actor.prototype.onMessage = function onMessage(from, message) {
  var listeners = this.listeners;
  for (var i = 0, ii = listeners.length; i < ii; i++) {
    var listener = listeners[i],
        pattern = listener.pattern,
        stopPropagation;

    if (pattern instanceof Function && pattern(message)) {
      stopPropagation = listener.callback.call(this, from, message);
    }
    else if (pattern instanceof RegExp && pattern.test(message)) {
      stopPropagation = listener.callback.call(this, from, message);
    }
    else if (pattern == message) { // string
      stopPropagation = listener.callback.call(this, from, message);
    }

    if (stopPropagation) break;
  }
};

/**
 * Add a message listener for incoming messages
 * @param {String | RegExp | Function} pattern    Message pattern
 * @param {Function} callback                     Callback function invoked when
 *                                                a message is received. Invoked
 *                                                as callback(message)
 *                                                if the callback returns true,
 *                                                propagation to other message
 *                                                listeners will be stopped.
 */
Actor.prototype.on = function on(pattern, callback) {
  this.listeners.push({
    pattern: pattern,
    callback: callback
  });
};

/**
 * Remove a message listener for incoming messages
 * @param {String | RegExp | Function} pattern    Message pattern
 * @param {Function} callback                     Callback invoked when a
 *                                                message is received. Invoked
 *                                                as callback(message)
 */
Actor.prototype.off = function off(pattern, callback) {
  var listeners = this.listeners;
  for (var i = 0, ii = listeners.length; i < ii; i++) {
    var listener = listeners[i];
    if (listener.pattern === pattern && listener.callback === callback) {
      listeners.splice(i, 1);
      break;
    }
  }
};

/**
 * Connect to a message bus. The actor will subscribe itself to
 * messages sent to his id.
 * @param {MessageBus} messagebus
 * @return {Promise.<Actor, error>} Returns a promise which resolves when the
 *                                  actor is connected to the messagebus
 */
Actor.prototype.connect = function connect (messagebus) {
  var connection = {
    id: this.id,
    messagebus: messagebus,
    listener: this.onMessage.bind(this)
  };
  this.connections.push(connection);

  var me = this;
  return messagebus
      .connect(connection.id, connection.listener)
      .then(function () {
        return me;
      });
};

/**
 * Disconnect from a message bus
 * @param {MessageBus} messagebus
 */
Actor.prototype.disconnect = function disconnect (messagebus) {
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];
    if (connection.messagebus === messagebus) {
      messagebus.disconnect(connection.id);
      connections.splice(i, 1);
      break;
    }
  }
};

module.exports = Actor;
