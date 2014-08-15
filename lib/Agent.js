var uuid = require('node-uuid');

/**
 * Agent
 * @param {String} [id] Id for the agent. If not provided, the agent will be
 *                      given a uuid.
 * @constructor
 */
function Agent (id) {
  this.id = id ? id.toString() : uuid.v4();
  this.listeners = [];
  this.connections = [];
}

/**
 * Send a message to an agent
 * @param {String} to       Id of the agent
 * @param {String} message  Message to be send
 */
Agent.prototype.send = function(to, message) {
  // TODO: this send method should be reworked. Remove overhead as much as possible
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];

    // TODO: send should only try a next connection when a connection failed because the peer was not found
    try {
      connection.transport.send(this.id, to, message);

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
Agent.prototype.onMessage = function(from, message) {
  // TODO: support multiple cascaded onMessage handlers (do the same with send?)
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
Agent.prototype.on = function(pattern, callback) {
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
Agent.prototype.off = function(pattern, callback) {
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
 * Connect to a transport. The agent will subscribe itself to
 * messages sent to his id.
 * @param {Transport} transport
 * @return {Promise.<Agent, error>} Returns a promise which resolves when the
 *                                  agent is connected to the transport
 */
Agent.prototype.connect = function(transport) {
  var connection = {
    id: this.id,
    transport: transport,
    listener: this.onMessage.bind(this)
  };
  this.connections.push(connection);

  var me = this;
  return transport
      .connect(connection.id, connection.listener)
      .then(function () {
        return me;
      });
};

/**
 * Disconnect from a transport
 * @param {Transport} transport
 */
Agent.prototype.disconnect = function(transport) {
  var connections = this.connections;
  for (var i = 0, ii = connections.length; i < ii; i++) {
    var connection = connections[i];
    if (connection.transport === transport) {
      transport.disconnect(connection.id);
      connections.splice(i, 1);
      break;
    }
  }
};

module.exports = Agent;
