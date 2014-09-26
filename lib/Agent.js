'use strict';

var Promise = require('promise');
var uuid = require('uuid-v4');
var util = require('./util');
var system = require('./system');

/**
 * Agent
 * @param {string} [id]         Id for the agent. If not provided, the agent
 *                              will be given a uuid.
 * @constructor
 */
function Agent (id) {
  this.id = id ? id.toString() : uuid();

  // a list with all connected transports
  this.connections = [];
  this.defaultConnection = null;
  this.ready = Promise.resolve([]);
}

// an object with modules which can be used to extend the agent
Agent.modules = {};

/**
 * Register a new type of module. This module can then be loaded via
 * Agent.extend() and Agent.loadModule().
 * @param {Function} constructor     A module constructor
 */
Agent.registerModule = function (constructor) {
  var type = constructor.prototype.type;
  if (typeof constructor !== 'function') {
    throw new Error('Constructor function expected');
  }
  if (!type) {
    throw new Error('Field "prototype.type" missing in transport constructor');
  }
  if (type in Agent.modules) {
    if (Agent.modules[type] !== constructor) {
      throw new Error('Module of type "' + type + '" already exists');
    }
  }

  Agent.modules[type] = constructor;
};

/**
 * Extend an agent with modules (mixins).
 * The modules new functions are added to the Agent itself.
 * See also function `loadModule`.
 * @param {string | string[]} module  A module name or an Array with module
 *                                    names. Available modules:
 *                                    'pattern', 'request', 'babble'
 * @param {Object} [options]          Additional options for loading the module
 * @return {Agent} Returns the agent itself
 */
Agent.prototype.extend = function (module, options) {
  if (Array.isArray(module)) {
    var modules = [].concat(module);

    // order the modules such that 'pattern' comes first, this module must be
    // loaded before other modules ('request' specifically)
    modules.sort(function (a, b) {
      if (a == 'pattern') return -1;
      if (b == 'pattern') return 1;
      return 0;
    });

    // an array with module names
    for (var i = 0; i < modules.length; i++) {
      this.extend(modules[i], options)
    }
  }
  else {
    // a single module name
    var constructor = _getModuleConstructor(module);
    var instance = new constructor(this, options);
    var mixin = instance.mixin();

    // check for conflicts in the modules mixin functions
    var me = this;
    Object.keys(mixin).forEach(function (name) {
      if (me[name] !== undefined && name !== '_receive') {
        throw new Error('Conflict: agent already has a property "' + prop + '"');
      }
    });

    // extend the agent with all mixin functions provided by the module
    Object.keys(mixin).forEach(function (name) {
      me[name] = mixin[name];
    });
  }

  return this;
};

/**
 * Load a module onto an agent.
 * See also function `extend`.
 * @param {string | string[]} module  A module name or an Array with module
 *                                    names. Available modules:
 *                                    'pattern', 'request', 'babble'
 * @param {Object} [options]          Additional options for loading the module
 * @return {Object} Returns the created module
 */
Agent.prototype.loadModule = function (module, options) {
  var _options = options !== undefined ? Object.create(options) : {};
  _options.extend = false;

  var constructor = _getModuleConstructor(module);
  var instance = new constructor(this, options);
  var mixin = instance.mixin();

  // only replace the _receive function, do not add other mixin functions
  this._receive = mixin._receive;

  return instance;
};

/**
 * Get a module constructor by it's name.
 * Throws an error when the module is not found.
 * @param {string} name
 * @return {function} Returns the modules constructor function
 * @private
 */
function _getModuleConstructor(name) {
  var constructor = Agent.modules[name];
  if (!constructor) {
    throw new Error('Unknown module "' + name + '". ' +
        'Choose from: ' + Object.keys(Agent.modules).map(JSON.stringify).join(', '));
  }
  return constructor;
}

/**
 * Send a message to an agent
 * @param {string} to
 *              to is either:
 *              - A string "agentId", the id of the recipient. Will be send
 *                via the default transport or when there is no default
 *                transport via the first connected transport.
 *              - A string "agentId@transportId" Only usable locally, not
 *                for sharing an address with remote agents.
 *              - A string "protocol://networkId/agentId". This is a sharable
 *                identifier for an agent.
 * @param {*} message  Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 */
Agent.prototype.send = function(to, message) {
  var colon = to.indexOf('://');
  if (colon !== -1) {
    // to is an url like "protocol://networkId/agentId"
    var url = util.parseUrl(to);
    if (url.protocol == 'http' || url.protocol == 'ws' || url.protocol == 'https') { // TODO: ugly fixed listing here...
      return this._sendByProtocol(url.protocol, to, message);
    }
    else {
      return this._sendByNetworkId(url.domain, url.path, message);
    }
  }

  // TODO: deprecate this notation "agentId@transportId"?
  var at = to.indexOf('@');
  if (at != -1) {
    // to is an id like "agentId@transportId"
    var _to = to.substring(0, at);
    var _transportId = to.substring(at + 1);
    return this._sendByTransportId(_transportId, _to, message);
  }

  // to is an id like "agentId". Send via the default transport
  var conn = this.defaultConnection;
  if (conn) {
    return conn.send(to, message);
  }
  else {
    return Promise.reject(new Error('No transport found'));
  }
};

/**
 * Send a transport to an agent given a networkId
 * @param {string} networkId    A network id
 * @param {string} to           An agents id
 * @param {string} message      Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 * @private
 */
Agent.prototype._sendByNetworkId = function(networkId, to, message) {
  // TODO: change this.connections to a map with networkId as keys, much faster
  for (var i = 0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    if (connection.transport.networkId == networkId) {
      return connection.send(to, message);
    }
  }

  return Promise.reject(new Error('No transport found with networkId "' + networkId + '"'));
};

/**
 * Send a message by a transport by protocol.
 * The message will be send via the first found transport having the specified
 * protocol.
 * @param {string} protocol     A protocol, for example 'http' or 'ws'
 * @param {string} to           An agents id
 * @param {string} message      Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 * @private
 */
Agent.prototype._sendByProtocol = function(protocol, to, message) {
  for (var i = 0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    if (connection.transport.type == protocol) {
      return connection.send(to, message);
    }
  }

  return Promise.reject(new Error('No transport found for protocol "' + protocol + '"'));
};

/**
 * Send a transport to an agent via a specific transport
 * @param {string} transportId  The configured id of a transport.
 * @param {string} to           An agents id
 * @param {string} message      Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 * @private
 */
Agent.prototype._sendByTransportId = function(transportId, to, message) {
  for (var i = 0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    if (connection.transport.id == transportId) {
      return connection.send(to, message);
    }
  }

  return Promise.reject(new Error('No transport found with id "' + transportId + '"'));
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
 * @param {string | Transport | Transport[] | string[]} transport
 *                                  A Transport instance, or the id of a
 *                                  transport loaded in eve.system.
 * @param {string} [id]             An optional alternative id to be used
 *                                  for the connection. By default, the agents
 *                                  own id is used.
 * @return {Connection | Connection[]}  Returns a connection or, in case of
 *                                      multiple transports, returns an
 *                                      array with connections. The connections
 *                                      have a promise .ready which resolves
 *                                      as soon as the connection is ready for
 *                                      use.
 */
Agent.prototype.connect = function(transport, id) {
  if (Array.isArray(transport)) {
    var me = this;
    return transport.map(function (_transport) {
      return me._connect(_transport, id);
    });
  }
  else if (typeof transport === 'string') {
    // get transport by id
    return this._connect(system.transports.get(transport), id);
  }
  else {
    // a transport instance
    return this._connect(transport, id);
  }
};

/**
 * Connect to a transport
 * @param {Transport} transport     A Transport instance
 * @param {string} [id]             An optional alternative id to be used
 *                                  for the connection. By default, the agents
 *                                  own id is used.
 * @return {Connection}             Returns a connection.
 * @private
 */
Agent.prototype._connect = function (transport, id) {
  // create a receive function which is bound to the _receive function.
  // the _receive function can be replaced in by modules in a cascaded way,
  // and in the end calls this.receive of the agent.
  // note: we don't do receive = this._receive.bind(this) as the _receive
  //       function can be overloaded after a connection is made.
  var me = this;
  var receive = function (from, message) {
    return me._receive(from, message);
  };
  var connection = transport.connect(id || this.id, receive);
  this.connections.push(connection);

  // set or replace the defaultConnection
  if (!this.defaultConnection) {
    this.defaultConnection = connection;
  }
  else if (transport['default']) {
    if (this.defaultConnection['default']) {
      throw new Error('Cannot connect to a second default transport');
    }
    this.defaultConnection = connection;
  }

  this._updateReady();

  return connection;
};

/**
 * Disconnect from one or multiple transports
 * @param {string | Transport | string[] | Transport[]} [transport]
 *              A transport or an array with transports.
 *              parameter transport can be an instance of a Transport, or the
 *              id of a transport.
 *              When transport is undefined, the agent will be disconnected
 *              from all connected transports.
 */
Agent.prototype.disconnect = function(transport) {
  var i, connection;

  if (!transport) {
    // disconnect all transports
    while (connection = this.connections[0]) {
      this._disconnect(connection);
    }
  }
  else if (Array.isArray(transport)) {
    // an array with transports
    i = 0;
    while (i < this.connections.length) {
      connection = this.connections[i];
      if (transport.indexOf(connection.transport) !== -1) {
        this._disconnect(connection);
      }
      else {
        i++;
      }
    }
  }
  else if (typeof transport === 'string') {
    // transport by id
    this.disconnect(system.transports.get(transport));
  }
  else {
    // a single transport
    for (i = 0; i < this.connections.length; i++) {
      connection = this.connections[i];
      if (connection.transport === transport) {
        this._disconnect(connection);
        break;
      }
    }
  }
};

/**
 * Close a connection
 * @param {Connection} connection
 * @private
 */
Agent.prototype._disconnect = function (connection) {
  // find the connection
  var index = this.connections.indexOf(connection);
  if (index !== -1) {
    // close the connection
    connection.close();

    // remove from the list with connections
    this.connections.splice(index, 1);

    // replace the defaultConnection if needed
    if (this.defaultConnection === connection) {
      this.defaultConnection = this.connections[this.connections.length - 1] || null;
    }
  }

  this._updateReady();
};

/**
 * Update the ready state of the agent
 * @private
 */
Agent.prototype._updateReady = function () {
  // FIXME: we should not replace with a new Promise,
  //        we have a problem when this.ready is requested before ready,
  //        and another connection is opened before ready
  this.ready = Promise.all(this.connections.map(function (connection) {
    return connection.ready;
  }));
};

module.exports = Agent;
