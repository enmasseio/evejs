var Promise = require('promise');
var uuid = require('node-uuid');
var babble = require('babble');
var pattern = require('./module/pattern');
var request = require('./module/request');

/**
 * Agent
 * @param {string} [id]         Id for the agent. If not provided, the agent
 *                              will be given a uuid.
 * @constructor
 */
function Agent (id) {
  this.id = id ? id.toString() : uuid.v4();

  // a list with all connected transports
  this.connections = [];
}

// an object with modules which can be used to extend the agent
Agent.modules = {
  pattern: function (agent, options) {
    return pattern.patternize(agent, {
      receive: '_receive',
      stopPropagation: options && options.stopPropagation || false
    });
  },

  request: function (agent, options) {
    return request.requestify(agent, {
      receive: '_receive',
      timeout: options && options.timeout || null
    });
  },

  babble: function (agent, options) {
    return babble.babblify(agent, {
      receive: '_receive'
    });
  }
};

/**
 * Extend an agent with modules (mixins)
 * @param {string} module       A module name. Available modules:
 *                              'pattern', 'request', 'babble'
 * @param {Object} [options]    Additional options for loading the module
 * @return {Agent} Returns the agent itself
 */
Agent.prototype.extend = function (module, options) {
  var mixin = Agent.modules[module];
  if (!mixin) {
    throw new Error('Unknown module "' + module + '". ' +
        'Choose from: ' + Object.keys(Agent.modules).map(JSON.stringify).join(', '));
  }

  mixin(this, options);

  return this;
};

/**
 * Send a message to an agent
 * @param {string | {id: string, transport: string} | {id: string, transportId: string}} to
 *              to is either:
 *              - the id of the recipient
 *              - an object specifying the type of transport and the id of the recipient
 *              - an object specifying the id of a transport and the id of the recipient
 * @param {string} message  Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 */
Agent.prototype.send = function(to, message) {
  // TODO: this send method should be reworked. Remove overhead as much as possible.
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
 * @param {string} from     Id of sender
 * @param {*} message       Received message, a JSON object (often a string)
 */
Agent.prototype.receive = function(from, message) {
  // ... to be overloaded
};

/**
 * The method _receive is overloaded in a cascaded way by modules, and calls
 * the public method Agent.receive at the end of the chain.
 * @param {string} from     Id of sender
 * @param {*} message       Received message, a JSON object (often a string)
 * @returns {*} Returns the return value of Agent.receive
 * @private
 */
Agent.prototype._receive = function (from, message) {
  return this.receive(from, message);
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

    // create a receive function which is bound to the _receive function.
    // the _receive function can be replaced in by modules in a cascaded way,
    // and in the end calls this.receive of the agent.
    // note: we don't do receive = this._receive.bind(this) as the _receive
    //       function can be overloaded after a connection is made.
    var receive = function (from, message) {
      return me._receive(from, message);
    };
    return transport
        .connect(connection.id, receive)
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
