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
 * @param {String} id       Id of the actor
 * @param {String} message  Message to be send
 * @param {*} [data]        Optional extra data
 */
Actor.prototype.send = function send(id, message, data) {
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];

    // TODO: send should only try a next connection when a connection failed because the peer was not found
    try {
      connection.messagebus.send(this.id, id, message, data);

      // break if successful
      break;
    }
    catch (err) {
      if (i == ii - 1) {
        // the last connection failed. Rethrow the error
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
 * @param {*} [data]        Optional extra data
 */
Actor.prototype.receive = function receive(from, message, data) {
  var listeners = this.listeners;
  for (var i = 0, ii = listeners.length; i < ii; i++) {
    var listener = listeners[i],
        pattern = listener.pattern,
        stopPropagation;

    if (pattern instanceof Function && pattern(message)) {
      stopPropagation = listener.callback.apply(this, arguments);
    }
    else if (pattern instanceof RegExp && pattern.test(message)) {
      stopPropagation = listener.callback.apply(this, arguments);
    }
    else if (pattern == message) { // string
      stopPropagation = listener.callback.apply(this, arguments);
    }

    if (stopPropagation) break;
  }
};

/**
 * Add a message listener for incoming messages
 * @param {String | RegExp | Function} pattern    Message pattern
 * @param {Function} callback                     Callback function invoked when
 *                                                a message is received. Invoked
 *                                                as callback(message [, data])
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
 *                                                as callback(message [, data])
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
 * @param {{register: Function, unregister: Function, send: Function}} messagebus
 */
Actor.prototype.connect = function connect (messagebus) {
  var connection = {
    id: this.id,
    messagebus: messagebus,
    listener: this.receive.bind(this)
  };
  this.connections.push(connection);
  messagebus.register(connection.id, connection.listener);
};

/**
 * Disconnect from a message bus
 * @param {{register: Function, unregister: Function, send: Function}} messagebus
 */
Actor.prototype.disconnect = function disconnect (messagebus) {
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];
    if (connection.messagebus === messagebus) {
      messagebus.unregister(connection.id, connection.listener);
      connections.splice(i, 1);
      break;
    }
  }
};

module.exports = Actor;
