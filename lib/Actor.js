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
 * @param {*} [data]        Optional extra data
 */
Actor.prototype.onMessage = function onMessage(from, message, data) {
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

// TODO: implement a function emit (a simple version of onMessage)



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
 * @param {MessageBus} messagebus
 * @param {Function} [callback] optional callback invoked after the actor is
 *                              connected. Invoked without parameters.
 */
Actor.prototype.connect = function connect (messagebus, callback) {
  var connection = {
    id: this.id,
    messagebus: messagebus,
    listener: this.onMessage.bind(this)
  };
  this.connections.push(connection);
  messagebus.connect(connection.id, connection.listener, callback);
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
