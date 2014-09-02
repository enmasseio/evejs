var Promise = require('promise');
var uuid = require('node-uuid');
var BabbleModule = require('./module/BabbleModule');
var PatternModule = require('./module/PatternModule');
var RequestModule = require('./module/RequestModule');
var util = require('./util');
var system = require('./system');

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
  this.defaultConnection = null;
  this.ready = Promise.resolve([]);
}

// an object with modules which can be used to extend the agent
Agent.modules = {
  babble: BabbleModule,
  pattern: PatternModule,
  request: RequestModule
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
    var _options = options ? Object.create(options) : {};
    _options.extend = true;
    _loadModule(this, module, _options);
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
  var _options = options ? Object.create(options) : {};
  _options.extend = false;
  return _loadModule(this, module, _options);
};

/**
 * Load a module by its name
 * @param {Agent} agent
 * @param {string} module
 * @param {Object} [options]
 * @returns {Object} Returns the created module
 * @private
 */
function _loadModule(agent, module, options) {
  var constructor = Agent.modules[module];
  if (!constructor) {
    throw new Error('Unknown module "' + module + '". ' +
        'Choose from: ' + Object.keys(Agent.modules).map(JSON.stringify).join(', '));
  }

  if (options && typeof options !== 'object') {
    throw new Error('Module options must be an object');
  }

  return new constructor(agent, options);
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
 * @param {string} message  Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 */
Agent.prototype.send = function(to, message) {
  var colon = to.indexOf(':');
  if (colon !== -1) {
    // to is an url like "protocol://networkId/agentId"
    var url = util.splitUrl(to);
    if (url.protocol == 'http' || url.protocol == 'https') {
      return this._sendAsHTTP(to, message);
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
  return this.defaultConnection.send(to, message);
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

  throw new Error('No transport found with networkId "' + networkId + '"');
};

/**
 * Send a transport to an agent via a HTTPTransport
 * @param {string} to           An agents id
 * @param {string} message      Message to be send
 * @return {Promise} Returns a promise which resolves when the message as
 *                   successfully been sent, or rejected when sending the
 *                   message failed
 * @private
 */
Agent.prototype._sendAsHTTP = function(to, message) {
  for (var i = 0; i < this.connections.length; i++) {
    var connection = this.connections[i];
    if (connection.transport.type == 'http') {
      return connection.send(to, message);
    }
  }

  throw new Error('No HTTPTransport found');
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

  throw new Error('No transport found with id "' + transportId + '"');
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
