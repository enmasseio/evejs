var Promise = require('promise');
var uuid = require('node-uuid');

/**
 * Agent
 * @param {string} [id] Id for the agent. If not provided, the agent will be
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
 * @param {string | {id: string, transport: string} | {id: string, transportId: string}} to
 *              to is either:
 *              - the id of the recipient
 *              - an object specifying the type of transport and the id of the recipient
 *              - an object specifying the id of a transport and the id of the recipient
 * @param {string} message  Message to be send
 */
Agent.prototype.send = function(to, message) {
  // TODO: this send method should be reworked. Remove overhead as much as possible
  var i;
  var connection;

  if (typeof to === 'string') {
    // only id provided. Try each of the available transports until one succeeds

    // TODO: create a cache where we store the connection which was successful last time for this recipient
    for (i = 0; i < this.connections.length; i++) {
      connection = this.connections[i];

      // TODO: send should only try a next connection when a connection failed because the agent was not found
      try {
        connection.transport.send(connection.id, to, message);

        // break if successful
        break;
      }
      catch (err) {
        if (i == this.connections.length - 1) {
          // all connections failed. Rethrow the error
          throw err;
        }
      }
    }
  }
  else if (to.transport) {
    // `to` is an object like {transport: 'distribus', id: 'agent1'}
    // send a message via a transport of this type
    connection = this.connections.filter(function (conn) {
      return conn.transport.type == to.transport;
    })[0];

    if (connection) {
      connection.transport.send(connection.id, to.id, message);
    }
    else {
      throw new Error('No transport found of type "' + to.transport + '"');
    }
  }
  else if (to.transportId) {
    // `to` is an object like {transportId: '1234', id: 'agent1'}
    // send a message via a transport with this id
    connection = this.connections.filter(function (conn) {
      return conn.transport.id == to.transportId;
    })[0];

    if (connection) {
      connection.transport.send(connection.id, to.id, message);
    }
    else {
      throw new Error('No transport found with id "' + to.transportId + '"');
    }
  }
  else {
    // `to` is an object like {id: 'agent1'}
    this.send(to.id, message);
  }
};

/**
 * Receive a message.
 * All listeners will be checked against their patterns, and if there is a
 * match, the listeners callback function is invoked.
 * @param {string} from     Id of sender
 * @param {*} message       Received message, a JSON object (often a string)
 */
Agent.prototype.receive = function(from, message) {
  // TODO: support multiple cascaded message handlers (do the same with send?)
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
 * @param {string | RegExp | Function} pattern    Message pattern
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
 * @param {string | RegExp | Function} pattern    Message pattern
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
 * @param {Transport | Array.<Transport>} transport
 * @param {string} [id]             An optional alternative id to be used
 *                                  for the connection. By default, the agents
 *                                  own id is used.
 * @return {Promise.<Agent, error>} Returns a promise which resolves when the
 *                                  agent is connected to the transport
 */
Agent.prototype.connect = function(transport, id) {
  var me = this;

  if (Array.isArray(transport)) {
    return Promise.all(transport.map(function (t) {
      return me.connect(t, id);
    }));
  }
  else {
    var connection = {
      id: id || this.id,
      transport: transport
    };
    this.connections.push(connection);

    var listener = this.receive.bind(this);
    return transport
        .connect(connection.id, listener)
        .then(function () {
          return me;
        });
  }
};

/**
 * Disconnect from one or multiple transports
 * @param {Transport | Array.<Transport>} [transport] One transport or an array
 *                                                    with transports. If not
 *                                                    provided, the agent will
 *                                                    be disconnected from all
 *                                                    connected transports.
 */
Agent.prototype.disconnect = function(transport) {
  var i, connection;

  if (!transport) {
    // disconnect all transports
    for (i = 0; i < this.connections.length; i++) {
      connection = this.connections[i];
      connection.transport.disconnect(connection.id);
    }
    this.connections = [];
  }
  else if (Array.isArray(transport)) {
    transport.forEach(this.disconnect.bind(this));
  }
  else {
    // a single transport
    for (i = 0; i < this.connections.length; i++) {
      connection = this.connections[i];
      if (connection.transport === transport) {
        transport.disconnect(connection.id);
        this.connections.splice(i, 1);
        break;
      }
    }
  }
};

module.exports = Agent;
