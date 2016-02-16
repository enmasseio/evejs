(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("ws"), require("distribus"), require("http"));
	else if(typeof define === 'function' && define.amd)
		define(["ws", "distribus", "http"], factory);
	else if(typeof exports === 'object')
		exports["eve"] = factory(require("ws"), require("distribus"), require("http"));
	else
		root["eve"] = factory(root["ws"], root["distribus"], root["http"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_37__, __WEBPACK_EXTERNAL_MODULE_107__, __WEBPACK_EXTERNAL_MODULE_110__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	exports.Agent = __webpack_require__(1);
	exports.ServiceManager = __webpack_require__(14);
	exports.TransportManager = __webpack_require__(55);

	exports.module = {
	  BabbleModule: __webpack_require__(56),
	  PatternModule: __webpack_require__(99),
	  RequestModule: __webpack_require__(100),
	  RPCModule: __webpack_require__(101)
	};

	exports.transport = {
	  Transport:          __webpack_require__(102),
	  AMQPTransport:      __webpack_require__(103),
	  DistribusTransport: __webpack_require__(106),
	  HTTPTransport:      __webpack_require__(109),
	  LocalTransport:     __webpack_require__(112),
	  PubNubTransport:    __webpack_require__(114),
	  WebSocketTransport: __webpack_require__(116),

	  connection: {
	    Connection:          __webpack_require__(105),
	    AMQPConnection:      __webpack_require__(104),
	    DistribusConnection: __webpack_require__(108),
	    HTTPConnection:      __webpack_require__(111),
	    LocalConnection:     __webpack_require__(113),
	    PubNubConnection:    __webpack_require__(115),
	    WebSocketConnection: __webpack_require__(122)
	  }
	};

	exports.hypertimer = __webpack_require__(16);
	exports.util = __webpack_require__(13);

	// register all modules at the Agent
	exports.Agent.registerModule(exports.module.BabbleModule);
	exports.Agent.registerModule(exports.module.PatternModule);
	exports.Agent.registerModule(exports.module.RequestModule);
	exports.Agent.registerModule(exports.module.RPCModule);

	// register all transports at the TransportManager
	exports.TransportManager.registerType(exports.transport.AMQPTransport);
	exports.TransportManager.registerType(exports.transport.DistribusTransport);
	exports.TransportManager.registerType(exports.transport.HTTPTransport);
	exports.TransportManager.registerType(exports.transport.LocalTransport);
	exports.TransportManager.registerType(exports.transport.PubNubTransport);
	exports.TransportManager.registerType(exports.transport.WebSocketTransport);

	// load the default ServiceManager, a singleton, initialized with a LocalTransport
	exports.system = new exports.ServiceManager();
	exports.system.transports.add(new exports.transport.LocalTransport());

	// override Agent.getTransportById in order to support Agent.connect(transportId)
	exports.Agent.getTransportById = function (id) {
	  return exports.system.transports.get(id);
	};


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var uuid = __webpack_require__(12);
	var util = __webpack_require__(13);

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
	 * Get a transport by id.
	 * This static method can be overloaded for example by the get function of
	 * a singleton TransportManager.
	 * @param {string} id
	 * @return {Transport}
	 */
	Agent.getTransportById = function (id) {
	  throw new Error('Transport with id "' + id + '" not found');
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
	Agent.prototype.loadModule = function (module, options, additionalOptions) {
	  var _options = options !== undefined ? Object.create(options) : {};
	  _options.extend = false;

	  var constructor = _getModuleConstructor(module);
	  var instance = new constructor(this, options, additionalOptions);
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
	  // the https addresses also make use of the http protocol.
	  protocol = protocol == 'https' ? 'http' : protocol;

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
	    return this._connect(Agent.getTransportById(transport), id);
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
	    this.disconnect(Agent.getTransportById(transport));
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


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(3)


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(4);
	__webpack_require__(6);
	__webpack_require__(7);
	__webpack_require__(8);
	__webpack_require__(9);
	__webpack_require__(11);


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var asap = __webpack_require__(5);

	function noop() {}

	// States:
	//
	// 0 - pending
	// 1 - fulfilled with _value
	// 2 - rejected with _value
	// 3 - adopted the state of another promise, _value
	//
	// once the state is no longer pending (0) it is immutable

	// All `_` prefixed properties will be reduced to `_{random number}`
	// at build time to obfuscate them and discourage their use.
	// We don't use symbols or Object.defineProperty to fully hide them
	// because the performance isn't good enough.


	// to avoid using try/catch inside critical functions, we
	// extract them to here.
	var LAST_ERROR = null;
	var IS_ERROR = {};
	function getThen(obj) {
	  try {
	    return obj.then;
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}

	function tryCallOne(fn, a) {
	  try {
	    return fn(a);
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}
	function tryCallTwo(fn, a, b) {
	  try {
	    fn(a, b);
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}

	module.exports = Promise;

	function Promise(fn) {
	  if (typeof this !== 'object') {
	    throw new TypeError('Promises must be constructed via new');
	  }
	  if (typeof fn !== 'function') {
	    throw new TypeError('not a function');
	  }
	  this._45 = 0;
	  this._81 = 0;
	  this._65 = null;
	  this._54 = null;
	  if (fn === noop) return;
	  doResolve(fn, this);
	}
	Promise._10 = null;
	Promise._97 = null;
	Promise._61 = noop;

	Promise.prototype.then = function(onFulfilled, onRejected) {
	  if (this.constructor !== Promise) {
	    return safeThen(this, onFulfilled, onRejected);
	  }
	  var res = new Promise(noop);
	  handle(this, new Handler(onFulfilled, onRejected, res));
	  return res;
	};

	function safeThen(self, onFulfilled, onRejected) {
	  return new self.constructor(function (resolve, reject) {
	    var res = new Promise(noop);
	    res.then(resolve, reject);
	    handle(self, new Handler(onFulfilled, onRejected, res));
	  });
	};
	function handle(self, deferred) {
	  while (self._81 === 3) {
	    self = self._65;
	  }
	  if (Promise._10) {
	    Promise._10(self);
	  }
	  if (self._81 === 0) {
	    if (self._45 === 0) {
	      self._45 = 1;
	      self._54 = deferred;
	      return;
	    }
	    if (self._45 === 1) {
	      self._45 = 2;
	      self._54 = [self._54, deferred];
	      return;
	    }
	    self._54.push(deferred);
	    return;
	  }
	  handleResolved(self, deferred);
	}

	function handleResolved(self, deferred) {
	  asap(function() {
	    var cb = self._81 === 1 ? deferred.onFulfilled : deferred.onRejected;
	    if (cb === null) {
	      if (self._81 === 1) {
	        resolve(deferred.promise, self._65);
	      } else {
	        reject(deferred.promise, self._65);
	      }
	      return;
	    }
	    var ret = tryCallOne(cb, self._65);
	    if (ret === IS_ERROR) {
	      reject(deferred.promise, LAST_ERROR);
	    } else {
	      resolve(deferred.promise, ret);
	    }
	  });
	}
	function resolve(self, newValue) {
	  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
	  if (newValue === self) {
	    return reject(
	      self,
	      new TypeError('A promise cannot be resolved with itself.')
	    );
	  }
	  if (
	    newValue &&
	    (typeof newValue === 'object' || typeof newValue === 'function')
	  ) {
	    var then = getThen(newValue);
	    if (then === IS_ERROR) {
	      return reject(self, LAST_ERROR);
	    }
	    if (
	      then === self.then &&
	      newValue instanceof Promise
	    ) {
	      self._81 = 3;
	      self._65 = newValue;
	      finale(self);
	      return;
	    } else if (typeof then === 'function') {
	      doResolve(then.bind(newValue), self);
	      return;
	    }
	  }
	  self._81 = 1;
	  self._65 = newValue;
	  finale(self);
	}

	function reject(self, newValue) {
	  self._81 = 2;
	  self._65 = newValue;
	  if (Promise._97) {
	    Promise._97(self, newValue);
	  }
	  finale(self);
	}
	function finale(self) {
	  if (self._45 === 1) {
	    handle(self, self._54);
	    self._54 = null;
	  }
	  if (self._45 === 2) {
	    for (var i = 0; i < self._54.length; i++) {
	      handle(self, self._54[i]);
	    }
	    self._54 = null;
	  }
	}

	function Handler(onFulfilled, onRejected, promise){
	  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
	  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
	  this.promise = promise;
	}

	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, promise) {
	  var done = false;
	  var res = tryCallTwo(fn, function (value) {
	    if (done) return;
	    done = true;
	    resolve(promise, value);
	  }, function (reason) {
	    if (done) return;
	    done = true;
	    reject(promise, reason);
	  })
	  if (!done && res === IS_ERROR) {
	    done = true;
	    reject(promise, LAST_ERROR);
	  }
	}


/***/ },
/* 5 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {"use strict";

	// Use the fastest means possible to execute a task in its own turn, with
	// priority over other events including IO, animation, reflow, and redraw
	// events in browsers.
	//
	// An exception thrown by a task will permanently interrupt the processing of
	// subsequent tasks. The higher level `asap` function ensures that if an
	// exception is thrown by a task, that the task queue will continue flushing as
	// soon as possible, but if you use `rawAsap` directly, you are responsible to
	// either ensure that no exceptions are thrown from your task, or to manually
	// call `rawAsap.requestFlush` if an exception is thrown.
	module.exports = rawAsap;
	function rawAsap(task) {
	    if (!queue.length) {
	        requestFlush();
	        flushing = true;
	    }
	    // Equivalent to push, but avoids a function call.
	    queue[queue.length] = task;
	}

	var queue = [];
	// Once a flush has been requested, no further calls to `requestFlush` are
	// necessary until the next `flush` completes.
	var flushing = false;
	// `requestFlush` is an implementation-specific method that attempts to kick
	// off a `flush` event as quickly as possible. `flush` will attempt to exhaust
	// the event queue before yielding to the browser's own event loop.
	var requestFlush;
	// The position of the next task to execute in the task queue. This is
	// preserved between calls to `flush` so that it can be resumed if
	// a task throws an exception.
	var index = 0;
	// If a task schedules additional tasks recursively, the task queue can grow
	// unbounded. To prevent memory exhaustion, the task queue will periodically
	// truncate already-completed tasks.
	var capacity = 1024;

	// The flush function processes all tasks that have been scheduled with
	// `rawAsap` unless and until one of those tasks throws an exception.
	// If a task throws an exception, `flush` ensures that its state will remain
	// consistent and will resume where it left off when called again.
	// However, `flush` does not make any arrangements to be called again if an
	// exception is thrown.
	function flush() {
	    while (index < queue.length) {
	        var currentIndex = index;
	        // Advance the index before calling the task. This ensures that we will
	        // begin flushing on the next task the task throws an error.
	        index = index + 1;
	        queue[currentIndex].call();
	        // Prevent leaking memory for long chains of recursive calls to `asap`.
	        // If we call `asap` within tasks scheduled by `asap`, the queue will
	        // grow, but to avoid an O(n) walk for every task we execute, we don't
	        // shift tasks off the queue after they have been executed.
	        // Instead, we periodically shift 1024 tasks off the queue.
	        if (index > capacity) {
	            // Manually shift all values starting at the index back to the
	            // beginning of the queue.
	            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
	                queue[scan] = queue[scan + index];
	            }
	            queue.length -= index;
	            index = 0;
	        }
	    }
	    queue.length = 0;
	    index = 0;
	    flushing = false;
	}

	// `requestFlush` is implemented using a strategy based on data collected from
	// every available SauceLabs Selenium web driver worker at time of writing.
	// https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

	// Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
	// have WebKitMutationObserver but not un-prefixed MutationObserver.
	// Must use `global` instead of `window` to work in both frames and web
	// workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
	var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;

	// MutationObservers are desirable because they have high priority and work
	// reliably everywhere they are implemented.
	// They are implemented in all modern browsers.
	//
	// - Android 4-4.3
	// - Chrome 26-34
	// - Firefox 14-29
	// - Internet Explorer 11
	// - iPad Safari 6-7.1
	// - iPhone Safari 7-7.1
	// - Safari 6-7
	if (typeof BrowserMutationObserver === "function") {
	    requestFlush = makeRequestCallFromMutationObserver(flush);

	// MessageChannels are desirable because they give direct access to the HTML
	// task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
	// 11-12, and in web workers in many engines.
	// Although message channels yield to any queued rendering and IO tasks, they
	// would be better than imposing the 4ms delay of timers.
	// However, they do not work reliably in Internet Explorer or Safari.

	// Internet Explorer 10 is the only browser that has setImmediate but does
	// not have MutationObservers.
	// Although setImmediate yields to the browser's renderer, it would be
	// preferrable to falling back to setTimeout since it does not have
	// the minimum 4ms penalty.
	// Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
	// Desktop to a lesser extent) that renders both setImmediate and
	// MessageChannel useless for the purposes of ASAP.
	// https://github.com/kriskowal/q/issues/396

	// Timers are implemented universally.
	// We fall back to timers in workers in most engines, and in foreground
	// contexts in the following browsers.
	// However, note that even this simple case requires nuances to operate in a
	// broad spectrum of browsers.
	//
	// - Firefox 3-13
	// - Internet Explorer 6-9
	// - iPad Safari 4.3
	// - Lynx 2.8.7
	} else {
	    requestFlush = makeRequestCallFromTimer(flush);
	}

	// `requestFlush` requests that the high priority event queue be flushed as
	// soon as possible.
	// This is useful to prevent an error thrown in a task from stalling the event
	// queue if the exception handled by Node.js’s
	// `process.on("uncaughtException")` or by a domain.
	rawAsap.requestFlush = requestFlush;

	// To request a high priority event, we induce a mutation observer by toggling
	// the text of a text node between "1" and "-1".
	function makeRequestCallFromMutationObserver(callback) {
	    var toggle = 1;
	    var observer = new BrowserMutationObserver(callback);
	    var node = document.createTextNode("");
	    observer.observe(node, {characterData: true});
	    return function requestCall() {
	        toggle = -toggle;
	        node.data = toggle;
	    };
	}

	// The message channel technique was discovered by Malte Ubl and was the
	// original foundation for this library.
	// http://www.nonblocking.io/2011/06/windownexttick.html

	// Safari 6.0.5 (at least) intermittently fails to create message ports on a
	// page's first load. Thankfully, this version of Safari supports
	// MutationObservers, so we don't need to fall back in that case.

	// function makeRequestCallFromMessageChannel(callback) {
	//     var channel = new MessageChannel();
	//     channel.port1.onmessage = callback;
	//     return function requestCall() {
	//         channel.port2.postMessage(0);
	//     };
	// }

	// For reasons explained above, we are also unable to use `setImmediate`
	// under any circumstances.
	// Even if we were, there is another bug in Internet Explorer 10.
	// It is not sufficient to assign `setImmediate` to `requestFlush` because
	// `setImmediate` must be called *by name* and therefore must be wrapped in a
	// closure.
	// Never forget.

	// function makeRequestCallFromSetImmediate(callback) {
	//     return function requestCall() {
	//         setImmediate(callback);
	//     };
	// }

	// Safari 6.0 has a problem where timers will get lost while the user is
	// scrolling. This problem does not impact ASAP because Safari 6.0 supports
	// mutation observers, so that implementation is used instead.
	// However, if we ever elect to use timers in Safari, the prevalent work-around
	// is to add a scroll event listener that calls for a flush.

	// `setTimeout` does not call the passed callback if the delay is less than
	// approximately 7 in web workers in Firefox 8 through 18, and sometimes not
	// even then.

	function makeRequestCallFromTimer(callback) {
	    return function requestCall() {
	        // We dispatch a timeout with a specified delay of 0 for engines that
	        // can reliably accommodate that request. This will usually be snapped
	        // to a 4 milisecond delay, but once we're flushing, there's no delay
	        // between events.
	        var timeoutHandle = setTimeout(handleTimer, 0);
	        // However, since this timer gets frequently dropped in Firefox
	        // workers, we enlist an interval handle that will try to fire
	        // an event 20 times per second until it succeeds.
	        var intervalHandle = setInterval(handleTimer, 50);

	        function handleTimer() {
	            // Whichever timer succeeds will cancel both timers and
	            // execute the callback.
	            clearTimeout(timeoutHandle);
	            clearInterval(intervalHandle);
	            callback();
	        }
	    };
	}

	// This is for `asap.js` only.
	// Its name will be periodically randomized to break any code that depends on
	// its existence.
	rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

	// ASAP was originally a nextTick shim included in Q. This was factored out
	// into this ASAP package. It was later adapted to RSVP which made further
	// amendments. These decisions, particularly to marginalize MessageChannel and
	// to capture the MutationObserver implementation in a closure, were integrated
	// back into ASAP proper.
	// https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(4);

	module.exports = Promise;
	Promise.prototype.done = function (onFulfilled, onRejected) {
	  var self = arguments.length ? this.then.apply(this, arguments) : this;
	  self.then(null, function (err) {
	    setTimeout(function () {
	      throw err;
	    }, 0);
	  });
	};


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(4);

	module.exports = Promise;
	Promise.prototype['finally'] = function (f) {
	  return this.then(function (value) {
	    return Promise.resolve(f()).then(function () {
	      return value;
	    });
	  }, function (err) {
	    return Promise.resolve(f()).then(function () {
	      throw err;
	    });
	  });
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//This file contains the ES6 extensions to the core Promises/A+ API

	var Promise = __webpack_require__(4);

	module.exports = Promise;

	/* Static Functions */

	var TRUE = valuePromise(true);
	var FALSE = valuePromise(false);
	var NULL = valuePromise(null);
	var UNDEFINED = valuePromise(undefined);
	var ZERO = valuePromise(0);
	var EMPTYSTRING = valuePromise('');

	function valuePromise(value) {
	  var p = new Promise(Promise._61);
	  p._81 = 1;
	  p._65 = value;
	  return p;
	}
	Promise.resolve = function (value) {
	  if (value instanceof Promise) return value;

	  if (value === null) return NULL;
	  if (value === undefined) return UNDEFINED;
	  if (value === true) return TRUE;
	  if (value === false) return FALSE;
	  if (value === 0) return ZERO;
	  if (value === '') return EMPTYSTRING;

	  if (typeof value === 'object' || typeof value === 'function') {
	    try {
	      var then = value.then;
	      if (typeof then === 'function') {
	        return new Promise(then.bind(value));
	      }
	    } catch (ex) {
	      return new Promise(function (resolve, reject) {
	        reject(ex);
	      });
	    }
	  }
	  return valuePromise(value);
	};

	Promise.all = function (arr) {
	  var args = Array.prototype.slice.call(arr);

	  return new Promise(function (resolve, reject) {
	    if (args.length === 0) return resolve([]);
	    var remaining = args.length;
	    function res(i, val) {
	      if (val && (typeof val === 'object' || typeof val === 'function')) {
	        if (val instanceof Promise && val.then === Promise.prototype.then) {
	          while (val._81 === 3) {
	            val = val._65;
	          }
	          if (val._81 === 1) return res(i, val._65);
	          if (val._81 === 2) reject(val._65);
	          val.then(function (val) {
	            res(i, val);
	          }, reject);
	          return;
	        } else {
	          var then = val.then;
	          if (typeof then === 'function') {
	            var p = new Promise(then.bind(val));
	            p.then(function (val) {
	              res(i, val);
	            }, reject);
	            return;
	          }
	        }
	      }
	      args[i] = val;
	      if (--remaining === 0) {
	        resolve(args);
	      }
	    }
	    for (var i = 0; i < args.length; i++) {
	      res(i, args[i]);
	    }
	  });
	};

	Promise.reject = function (value) {
	  return new Promise(function (resolve, reject) {
	    reject(value);
	  });
	};

	Promise.race = function (values) {
	  return new Promise(function (resolve, reject) {
	    values.forEach(function(value){
	      Promise.resolve(value).then(resolve, reject);
	    });
	  });
	};

	/* Prototype Methods */

	Promise.prototype['catch'] = function (onRejected) {
	  return this.then(null, onRejected);
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// This file contains then/promise specific extensions that are only useful
	// for node.js interop

	var Promise = __webpack_require__(4);
	var asap = __webpack_require__(10);

	module.exports = Promise;

	/* Static Functions */

	Promise.denodeify = function (fn, argumentCount) {
	  if (
	    typeof argumentCount === 'number' && argumentCount !== Infinity
	  ) {
	    return denodeifyWithCount(fn, argumentCount);
	  } else {
	    return denodeifyWithoutCount(fn);
	  }
	}

	var callbackFn = (
	  'function (err, res) {' +
	  'if (err) { rj(err); } else { rs(res); }' +
	  '}'
	);
	function denodeifyWithCount(fn, argumentCount) {
	  var args = [];
	  for (var i = 0; i < argumentCount; i++) {
	    args.push('a' + i);
	  }
	  var body = [
	    'return function (' + args.join(',') + ') {',
	    'var self = this;',
	    'return new Promise(function (rs, rj) {',
	    'var res = fn.call(',
	    ['self'].concat(args).concat([callbackFn]).join(','),
	    ');',
	    'if (res &&',
	    '(typeof res === "object" || typeof res === "function") &&',
	    'typeof res.then === "function"',
	    ') {rs(res);}',
	    '});',
	    '};'
	  ].join('');
	  return Function(['Promise', 'fn'], body)(Promise, fn);
	}
	function denodeifyWithoutCount(fn) {
	  var fnLength = Math.max(fn.length - 1, 3);
	  var args = [];
	  for (var i = 0; i < fnLength; i++) {
	    args.push('a' + i);
	  }
	  var body = [
	    'return function (' + args.join(',') + ') {',
	    'var self = this;',
	    'var args;',
	    'var argLength = arguments.length;',
	    'if (arguments.length > ' + fnLength + ') {',
	    'args = new Array(arguments.length + 1);',
	    'for (var i = 0; i < arguments.length; i++) {',
	    'args[i] = arguments[i];',
	    '}',
	    '}',
	    'return new Promise(function (rs, rj) {',
	    'var cb = ' + callbackFn + ';',
	    'var res;',
	    'switch (argLength) {',
	    args.concat(['extra']).map(function (_, index) {
	      return (
	        'case ' + (index) + ':' +
	        'res = fn.call(' + ['self'].concat(args.slice(0, index)).concat('cb').join(',') + ');' +
	        'break;'
	      );
	    }).join(''),
	    'default:',
	    'args[argLength] = cb;',
	    'res = fn.apply(self, args);',
	    '}',
	    
	    'if (res &&',
	    '(typeof res === "object" || typeof res === "function") &&',
	    'typeof res.then === "function"',
	    ') {rs(res);}',
	    '});',
	    '};'
	  ].join('');

	  return Function(
	    ['Promise', 'fn'],
	    body
	  )(Promise, fn);
	}

	Promise.nodeify = function (fn) {
	  return function () {
	    var args = Array.prototype.slice.call(arguments);
	    var callback =
	      typeof args[args.length - 1] === 'function' ? args.pop() : null;
	    var ctx = this;
	    try {
	      return fn.apply(this, arguments).nodeify(callback, ctx);
	    } catch (ex) {
	      if (callback === null || typeof callback == 'undefined') {
	        return new Promise(function (resolve, reject) {
	          reject(ex);
	        });
	      } else {
	        asap(function () {
	          callback.call(ctx, ex);
	        })
	      }
	    }
	  }
	}

	Promise.prototype.nodeify = function (callback, ctx) {
	  if (typeof callback != 'function') return this;

	  this.then(function (value) {
	    asap(function () {
	      callback.call(ctx, null, value);
	    });
	  }, function (err) {
	    asap(function () {
	      callback.call(ctx, err);
	    });
	  });
	}


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// rawAsap provides everything we need except exception management.
	var rawAsap = __webpack_require__(5);
	// RawTasks are recycled to reduce GC churn.
	var freeTasks = [];
	// We queue errors to ensure they are thrown in right order (FIFO).
	// Array-as-queue is good enough here, since we are just dealing with exceptions.
	var pendingErrors = [];
	var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

	function throwFirstError() {
	    if (pendingErrors.length) {
	        throw pendingErrors.shift();
	    }
	}

	/**
	 * Calls a task as soon as possible after returning, in its own event, with priority
	 * over other events like animation, reflow, and repaint. An error thrown from an
	 * event will not interrupt, nor even substantially slow down the processing of
	 * other events, but will be rather postponed to a lower priority event.
	 * @param {{call}} task A callable object, typically a function that takes no
	 * arguments.
	 */
	module.exports = asap;
	function asap(task) {
	    var rawTask;
	    if (freeTasks.length) {
	        rawTask = freeTasks.pop();
	    } else {
	        rawTask = new RawTask();
	    }
	    rawTask.task = task;
	    rawAsap(rawTask);
	}

	// We wrap tasks with recyclable task objects.  A task object implements
	// `call`, just like a function.
	function RawTask() {
	    this.task = null;
	}

	// The sole purpose of wrapping the task is to catch the exception and recycle
	// the task object after its single use.
	RawTask.prototype.call = function () {
	    try {
	        this.task.call();
	    } catch (error) {
	        if (asap.onerror) {
	            // This hook exists purely for testing purposes.
	            // Its name will be periodically randomized to break any code that
	            // depends on its existence.
	            asap.onerror(error);
	        } else {
	            // In a web browser, exceptions are not fatal. However, to avoid
	            // slowing down the queue of pending tasks, we rethrow the error in a
	            // lower priority turn.
	            pendingErrors.push(error);
	            requestErrorThrow();
	        }
	    } finally {
	        this.task = null;
	        freeTasks[freeTasks.length] = this;
	    }
	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(4);

	module.exports = Promise;
	Promise.enableSynchronous = function () {
	  Promise.prototype.isPending = function() {
	    return this.getState() == 0;
	  };

	  Promise.prototype.isFulfilled = function() {
	    return this.getState() == 1;
	  };

	  Promise.prototype.isRejected = function() {
	    return this.getState() == 2;
	  };

	  Promise.prototype.getValue = function () {
	    if (this._81 === 3) {
	      return this._65.getValue();
	    }

	    if (!this.isFulfilled()) {
	      throw new Error('Cannot get a value of an unfulfilled promise.');
	    }

	    return this._65;
	  };

	  Promise.prototype.getReason = function () {
	    if (this._81 === 3) {
	      return this._65.getReason();
	    }

	    if (!this.isRejected()) {
	      throw new Error('Cannot get a rejection reason of a non-rejected promise.');
	    }

	    return this._65;
	  };

	  Promise.prototype.getState = function () {
	    if (this._81 === 3) {
	      return this._65.getState();
	    }
	    if (this._81 === -1 || this._81 === -2) {
	      return 0;
	    }

	    return this._81;
	  };
	};

	Promise.disableSynchronous = function() {
	  Promise.prototype.isPending = undefined;
	  Promise.prototype.isFulfilled = undefined;
	  Promise.prototype.isRejected = undefined;
	  Promise.prototype.getValue = undefined;
	  Promise.prototype.getReason = undefined;
	  Promise.prototype.getState = undefined;
	};


/***/ },
/* 12 */
/***/ function(module, exports) {

	
	exports = module.exports = function() {
		var ret = '', value;
		for (var i = 0; i < 32; i++) {
			value = exports.random() * 16 | 0;
			// Insert the hypens
			if (i > 4 && i < 21 && ! (i % 4)) {
				ret += '-';
			}
			// Add the next random character
			ret += (
				(i === 12) ? 4 : (
					(i === 16) ? (value & 3 | 8) : value
				)
			).toString(16);
		}
		return ret;
	};

	var uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
	exports.isUUID = function(uuid) {
		return uuidRegex.test(uuid);
	};

	exports.random = function() {
		return Math.random();
	};



/***/ },
/* 13 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Test whether the provided value is a Promise.
	 * A value is marked as a Promise when it is an object containing functions
	 * `then` and `catch`.
	 * @param {*} value
	 * @return {boolean} Returns true when `value` is a Promise
	 */
	exports.isPromise = function (value) {
	  return value &&
	      typeof value['then'] === 'function' &&
	      typeof value['catch'] === 'function'
	};

	/**
	 * Splits an url like "protocol://domain/path"
	 * @param {string} url
	 * @return {{protocol: string, domain: string, path: string} | null}
	 *            Returns an object with properties protocol, domain, and path
	 *            when there is a match. Returns null if no valid url.
	 *
	 */
	exports.parseUrl = function (url) {
	  // match an url like "protocol://domain/path"
	  var match = /^([A-z]+):\/\/([^\/]+)(\/(.*)$|$)/.exec(url);
	  if (match) {
	    return {
	      protocol: match[1],
	      domain: match[2],
	      path: match[4]
	    }
	  }

	  return null;
	};

	/**
	 * Normalize a url. Removes trailing slash
	 * @param {string} url
	 * @return {string} Returns the normalized url
	 */
	exports.normalizeURL = function (url) {
	  if (url[url.length - 1] == '/') {
	    return url.substring(0, url.length - 1);
	  }
	  else {
	    return url;
	  }
	};


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var seed = __webpack_require__(15);
	var hypertimer = __webpack_require__(16);
	var TransportManager = __webpack_require__(55);

	// map with known configuration properties
	var KNOWN_PROPERTIES = {
	  transports: true,
	  timer: true,
	  random: true
	};

	function ServiceManager(config) {
	  this.transports = new TransportManager();

	  this.timer = hypertimer();

	  this.random = Math.random;

	  this.init(config);
	}

	/**
	 * Initialize the service manager with services loaded from a configuration
	 * object. All current services are unloaded and removed.
	 * @param {Object} config
	 */
	ServiceManager.prototype.init = function (config) {
	  this.transports.clear();

	  if (config) {
	    if (config.transports) {
	      this.transports.load(config.transports);
	    }

	    if (config.timer) {
	      this.timer.config(config.timer);
	    }

	    if (config.random) {
	      if (config.random.deterministic) {
	        var key = config.random.seed || 'random seed';
	        this.random = seed(key, config.random);
	      }
	      else {
	        this.random = Math.random;
	      }
	    }

	    for (var prop in config) {
	      if (config.hasOwnProperty(prop) && !KNOWN_PROPERTIES[prop]) {
	        // TODO: should log this warning via a configured logger
	        console.log('WARNING: Unknown configuration option "' + prop + '"')
	      }
	    }
	  }
	};

	/**
	 * Clear all configured services
	 */
	ServiceManager.prototype.clear = function () {
	  this.transports.clear();
	};

	module.exports = ServiceManager;


/***/ },
/* 15 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {'use strict';

	var width = 256;// each RC4 output is 0 <= x < 256
	var chunks = 6;// at least six RC4 outputs for each double
	var digits = 52;// there are 52 significant digits in a double
	var pool = [];// pool: entropy pool starts empty
	var GLOBAL = typeof global === 'undefined' ? window : global;

	//
	// The following constants are related to IEEE 754 limits.
	//
	var startdenom = Math.pow(width, chunks),
	    significance = Math.pow(2, digits),
	    overflow = significance * 2,
	    mask = width - 1;


	var oldRandom = Math.random;

	//
	// seedrandom()
	// This is the seedrandom function described above.
	//
	module.exports = function(seed, options) {
	  if (options && options.global === true) {
	    options.global = false;
	    Math.random = module.exports(seed, options);
	    options.global = true;
	    return Math.random;
	  }
	  var use_entropy = (options && options.entropy) || false;
	  var key = [];

	  // Flatten the seed string or build one from local entropy if needed.
	  var shortseed = mixkey(flatten(
	    use_entropy ? [seed, tostring(pool)] :
	    0 in arguments ? seed : autoseed(), 3), key);

	  // Use the seed to initialize an ARC4 generator.
	  var arc4 = new ARC4(key);

	  // Mix the randomness into accumulated entropy.
	  mixkey(tostring(arc4.S), pool);

	  // Override Math.random

	  // This function returns a random double in [0, 1) that contains
	  // randomness in every bit of the mantissa of the IEEE 754 value.

	  return function() {         // Closure to return a random double:
	    var n = arc4.g(chunks),             // Start with a numerator n < 2 ^ 48
	        d = startdenom,                 //   and denominator d = 2 ^ 48.
	        x = 0;                          //   and no 'extra last byte'.
	    while (n < significance) {          // Fill up all significant digits by
	      n = (n + x) * width;              //   shifting numerator and
	      d *= width;                       //   denominator and generating a
	      x = arc4.g(1);                    //   new least-significant-byte.
	    }
	    while (n >= overflow) {             // To avoid rounding up, before adding
	      n /= 2;                           //   last byte, shift everything
	      d /= 2;                           //   right using integer Math until
	      x >>>= 1;                         //   we have exactly the desired bits.
	    }
	    return (n + x) / d;                 // Form the number within [0, 1).
	  };
	};

	module.exports.resetGlobal = function () {
	  Math.random = oldRandom;
	};

	//
	// ARC4
	//
	// An ARC4 implementation.  The constructor takes a key in the form of
	// an array of at most (width) integers that should be 0 <= x < (width).
	//
	// The g(count) method returns a pseudorandom integer that concatenates
	// the next (count) outputs from ARC4.  Its return value is a number x
	// that is in the range 0 <= x < (width ^ count).
	//
	/** @constructor */
	function ARC4(key) {
	  var t, keylen = key.length,
	      me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];

	  // The empty key [] is treated as [0].
	  if (!keylen) { key = [keylen++]; }

	  // Set up S using the standard key scheduling algorithm.
	  while (i < width) {
	    s[i] = i++;
	  }
	  for (i = 0; i < width; i++) {
	    s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
	    s[j] = t;
	  }

	  // The "g" method returns the next (count) outputs as one number.
	  (me.g = function(count) {
	    // Using instance members instead of closure state nearly doubles speed.
	    var t, r = 0,
	        i = me.i, j = me.j, s = me.S;
	    while (count--) {
	      t = s[i = mask & (i + 1)];
	      r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
	    }
	    me.i = i; me.j = j;
	    return r;
	    // For robust unpredictability discard an initial batch of values.
	    // See http://www.rsa.com/rsalabs/node.asp?id=2009
	  })(width);
	}

	//
	// flatten()
	// Converts an object tree to nested arrays of strings.
	//
	function flatten(obj, depth) {
	  var result = [], typ = (typeof obj)[0], prop;
	  if (depth && typ == 'o') {
	    for (prop in obj) {
	      try { result.push(flatten(obj[prop], depth - 1)); } catch (e) {}
	    }
	  }
	  return (result.length ? result : typ == 's' ? obj : obj + '\0');
	}

	//
	// mixkey()
	// Mixes a string seed into a key that is an array of integers, and
	// returns a shortened string seed that is equivalent to the result key.
	//
	function mixkey(seed, key) {
	  var stringseed = seed + '', smear, j = 0;
	  while (j < stringseed.length) {
	    key[mask & j] =
	      mask & ((smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++));
	  }
	  return tostring(key);
	}

	//
	// autoseed()
	// Returns an object for autoseeding, using window.crypto if available.
	//
	/** @param {Uint8Array=} seed */
	function autoseed(seed) {
	  try {
	    GLOBAL.crypto.getRandomValues(seed = new Uint8Array(width));
	    return tostring(seed);
	  } catch (e) {
	    return [+new Date, GLOBAL, GLOBAL.navigator && GLOBAL.navigator.plugins,
	            GLOBAL.screen, tostring(pool)];
	  }
	}

	//
	// tostring()
	// Converts an array of charcodes to a string
	//
	function tostring(a) {
	  return String.fromCharCode.apply(0, a);
	}

	//
	// When seedrandom.js is loaded, we immediately mix a few bits
	// from the built-in RNG into the entropy pool.  Because we do
	// not want to intefere with determinstic PRNG state later,
	// seedrandom will not call Math.random on its own again after
	// initialization.
	//
	mixkey(Math.random(), pool);

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(17);


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	var emitter = __webpack_require__(18);
	var hasListeners = __webpack_require__(33);
	var createMaster = __webpack_require__(35).createMaster;
	var createSlave = __webpack_require__(51).createSlave;
	var util = __webpack_require__(54);

	// enum for type of timeout
	var TYPE = {
	  TIMEOUT: 0,
	  INTERVAL: 1,
	  TRIGGER: 2
	};

	/**
	 * Create a new hypertimer
	 * @param {Object} [options]  The following options are available:
	 *                            deterministic: boolean
	 *                                        If true (default), simultaneous events
	 *                                        are executed in a deterministic order.
	 *                            paced: boolean
	 *                                        Mode for pacing of time. When paced,
	 *                                        the time proceeds at a continuous,
	 *                                        configurable rate, useful for
	 *                                        animation purposes. When unpaced, the
	 *                                        time jumps immediately from scheduled
	 *                                        event to the next scheduled event.
	 *                            rate: number
	 *                                        The rate of progress of time with
	 *                                        respect to real-time. Rate must be a
	 *                                        positive number, and is 1 by default.
	 *                                        For example when 2, the time of the
	 *                                        hypertimer runs twice as fast as
	 *                                        real-time.
	 *                                        Only applicable when option paced=true.
	 *                            time: number | Date | String
	 *                                        Set a simulation time. If not provided,
	 *                                        The timer is instantiated with the
	 *                                        current system time.
	 */
	function hypertimer(options) {
	  // options
	  var paced = true;
	  var rate = 1;             // number of milliseconds per milliseconds
	  var deterministic = true; // run simultaneous events in a deterministic order
	  var configuredTime = null;// only used for returning the configured time on .config()
	  var master = null;        // url of master, will run as slave
	  var port = null;          // port to serve as master

	  // properties
	  var running = false;              // true when running
	  var startTime = null;             // timestamp. the moment in real-time when hyperTime was set
	  var hyperTime = util.systemNow(); // timestamp. the start time in hyper-time
	  var timeouts = [];                // array with all running timeouts
	  var current = {};                 // the timeouts currently in progress (callback is being executed)
	  var timeoutId = null;             // currently running timer
	  var idSeq = 0;                    // counter for unique timeout id's
	  var server = null;
	  var client = null;

	  // exported timer object with public functions and variables
	  // add event-emitter mixin
	  var timer = emitter({});

	  /**
	   * Change configuration options of the hypertimer, or retrieve current
	   * configuration.
	   * @param {Object} [options]  The following options are available:
	   *                            deterministic: boolean
	   *                                        If true (default), simultaneous events
	   *                                        are executed in a deterministic order.
	   *                            paced: boolean
	   *                                        Mode for pacing of time. When paced,
	   *                                        the time proceeds at a continuous,
	   *                                        configurable rate, useful for
	   *                                        animation purposes. When unpaced, the
	   *                                        time jumps immediately from scheduled
	   *                                        event to the next scheduled event.
	   *                            rate: number
	   *                                        The rate of progress of time with
	   *                                        respect to real-time. Rate must be a
	   *                                        positive number, and is 1 by default.
	   *                                        For example when 2, the time of the
	   *                                        hypertimer runs twice as fast as
	   *                                        real-time.
	   *                                        Only applicable when option paced=true.
	   *                            time: number | Date | String
	   *                                        Set a simulation time.
	   * @return {Object} Returns the applied configuration
	   */
	  timer.config = function(options) {
	    if (options) {
	      _validateConfig(options);
	      _setConfig(options);
	    }

	    // return a copy of the configuration options
	    return _getConfig();
	  };

	  /**
	   * Returns the current time of the timer as a number.
	   * See also getTime().
	   * @return {number} The time
	   */
	  timer.now = function () {
	    if (paced) {
	      if (running) {
	        // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
	        var realInterval = util.systemNow() - startTime;
	        var hyperInterval = realInterval * rate;
	        return hyperTime + hyperInterval;
	      }
	      else {
	        return hyperTime;
	      }
	    }
	    else {
	      return hyperTime;
	    }
	  };

	  /**
	   * Continue the timer.
	   */
	  timer['continue'] = function() {
	    startTime = util.systemNow();
	    running = true;

	    // reschedule running timeouts
	    _schedule();
	  };

	  /**
	   * Pause the timer. The timer can be continued again with `continue()`
	   */
	  timer.pause = function() {
	    hyperTime = timer.now();
	    startTime = null;
	    running = false;

	    // reschedule running timeouts (pauses them)
	    _schedule();
	  };

	  /**
	   * Returns the current time of the timer as Date.
	   * See also now().
	   * @return {Date} The time
	   */
	  timer.getTime = function() {
	    return new Date(timer.now());
	  };

	  /**
	   * Get the value of the hypertimer. This function returns the result of getTime().
	   * @return {Date} current time
	   */
	  timer.valueOf = timer.getTime;

	  /**
	   * Return a string representation of the current hyper-time.
	   * @returns {string} String representation
	   */
	  timer.toString = function () {
	    return timer.getTime().toString();
	  };

	  /**
	   * Set a timeout, which is triggered when the timeout occurs in hyper-time.
	   * See also setTrigger.
	   * @param {Function} callback   Function executed when delay is exceeded.
	   * @param {number} delay        The delay in milliseconds. When the delay is
	   *                              smaller or equal to zero, the callback is
	   *                              triggered immediately.
	   * @return {number} Returns a timeoutId which can be used to cancel the
	   *                  timeout using clearTimeout().
	   */
	  timer.setTimeout = function(callback, delay) {
	    var id = idSeq++;
	    var timestamp = timer.now() + delay;
	    if (isNaN(timestamp)) {
	      throw new TypeError('delay must be a number');
	    }

	    // add a new timeout to the queue
	    _queueTimeout({
	      id: id,
	      type: TYPE.TIMEOUT,
	      time: timestamp,
	      callback: callback
	    });

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };

	  /**
	   * Set a trigger, which is triggered when the timeout occurs in hyper-time.
	   * See also getTimeout.
	   * @param {Function} callback   Function executed when timeout occurs.
	   * @param {Date | number | string } time
	   *                              An absolute moment in time (Date) when the
	   *                              callback will be triggered. When the date is
	   *                              a Date in the past, the callback is triggered
	   *                              immediately.
	   * @return {number} Returns a triggerId which can be used to cancel the
	   *                  trigger using clearTrigger().
	   */
	  timer.setTrigger = function (callback, time) {
	    var id = idSeq++;
	    var timestamp = toTimestamp(time);

	    // add a new timeout to the queue
	    _queueTimeout({
	      id: id,
	      type: TYPE.TRIGGER,
	      time: timestamp,
	      callback: callback
	    });

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };


	  /**
	   * Trigger a callback every interval. Optionally, a start date can be provided
	   * to specify the first time the callback must be triggered.
	   * See also setTimeout and setTrigger.
	   * @param {Function} callback         Function executed when delay is exceeded.
	   * @param {number} interval           Interval in milliseconds. When interval
	   *                                    is smaller than zero or is infinity, the
	   *                                    interval will be set to zero and triggered
	   *                                    with a maximum rate.
	   * @param {Date | number | string} [firstTime]
	   *                                    An absolute moment in time (Date) when the
	   *                                    callback will be triggered the first time.
	   *                                    By default, firstTime = now() + interval.
	   * @return {number} Returns a intervalId which can be used to cancel the
	   *                  trigger using clearInterval().
	   */
	  timer.setInterval = function(callback, interval, firstTime) {
	    var id = idSeq++;

	    var _interval = Number(interval);
	    if (isNaN(_interval)) {
	      throw new TypeError('interval must be a number');
	    }
	    if (_interval < 0 || !isFinite(_interval)) {
	      _interval = 0;
	    }

	    var _firstTime = (firstTime != undefined) ?
	        toTimestamp(firstTime) :
	        null;

	    var now = timer.now();
	    var _time = (_firstTime != null) ? _firstTime : (now + _interval);

	    var timeout = {
	      id: id,
	      type: TYPE.INTERVAL,
	      interval: _interval,
	      time: _time,
	      firstTime: _firstTime != null ? _firstTime : _time,
	      occurrence: 0,
	      callback: callback
	    };

	    if (_time < now) {
	      // update schedule when in the past
	      _rescheduleInterval(timeout, now);
	    }

	    // add a new timeout to the queue
	    _queueTimeout(timeout);

	    // reschedule the timeouts
	    _schedule();

	    return id;
	  };

	  /**
	   * Cancel a timeout
	   * @param {number} timeoutId   The id of a timeout
	   */
	  timer.clearTimeout = function(timeoutId) {
	    // test whether timeout is currently being executed
	    if (current[timeoutId]) {
	      delete current[timeoutId];
	      return;
	    }

	    // find the timeout in the queue
	    for (var i = 0; i < timeouts.length; i++) {
	      if (timeouts[i].id === timeoutId) {
	        // remove this timeout from the queue
	        timeouts.splice(i, 1);

	        // reschedule timeouts
	        _schedule();
	        break;
	      }
	    }
	  };

	  /**
	   * Cancel a trigger
	   * @param {number} triggerId   The id of a trigger
	   */
	  timer.clearTrigger = timer.clearTimeout;

	  timer.clearInterval = timer.clearTimeout;

	  /**
	   * Returns a list with the id's of all timeouts
	   * @returns {number[]} Timeout id's
	   */
	  timer.list = function () {
	    return timeouts.map(function (timeout) {
	      return timeout.id;
	    });
	  };

	  /**
	   * Clear all timeouts
	   */
	  timer.clear = function () {
	    // empty the queue
	    current = {};
	    timeouts = [];

	    // reschedule
	    _schedule();
	  };

	  /**
	   * Destroy the timer. This will clear all timeouts, and close connections
	   * to a master or to slave timers.
	   */
	  timer.destroy = function () {
	    timer.clear();
	    if (client) client.destroy();
	    if (server) server.destroy();
	  };

	  /**
	   * Get the current configuration
	   * @returns {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}}
	   *                Returns a copy of the current configuration
	   * @private
	   */
	  function _getConfig () {
	    return {
	      paced: paced,
	      rate: rate,
	      deterministic: deterministic,
	      time: configuredTime,
	      master: master,
	      port: port
	    }
	  }

	  /**
	   * Validate configuration, depending on the current mode: slave or normal
	   * @param {Object} options
	   * @private
	   */
	  function _validateConfig (options) {
	    // validate writable options
	    if (client || options.master) {
	      // when we are a slave, we can't adjust the config, except for
	      // changing the master url or becoming a master itself (port configured)
	      for (var prop in options) {
	        if (prop !== 'master' && prop !== 'slave') {
	          throw new Error('Cannot apply configuration option "'  + prop +'", timer is configured as slave.');
	        }
	      }
	    }
	  }

	  /**
	   * Change configuration
	   * @param {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}} options
	   * @private
	   */
	  function _setConfig(options) {
	    if ('deterministic' in options) {
	      deterministic = options.deterministic ? true : false;
	    }

	    if ('paced' in options) {
	      paced = options.paced ? true : false;
	    }

	    // important: apply time before rate
	    if ('time' in options) {
	      hyperTime = toTimestamp(options.time);
	      startTime = util.systemNow();

	      // update intervals
	      _rescheduleIntervals(hyperTime);

	      configuredTime = new Date(hyperTime).toISOString();
	    }

	    if ('rate' in options) {
	      var newRate = Number(options.rate);
	      if (isNaN(newRate) || newRate <= 0) {
	        throw new TypeError('Invalid rate ' + JSON.stringify(options.rate) + '. Rate must be a positive number');
	      }

	      // important: first get the new hyperTime, then adjust the startTime
	      hyperTime = timer.now();
	      startTime = util.systemNow();
	      rate = newRate;
	    }

	    if ('master' in options) {
	      // create a timesync slave, connect to master via a websocket
	      if (client) {
	        client.destroy();
	        client = null;
	      }

	      master = options.master;
	      if (options.master != null) {
	        client = createSlave(options.master);

	        function applyConfig(config) {
	          var prev = _getConfig();
	          _setConfig(config);
	          var curr = _getConfig();
	          timer.emit('config', curr, prev);
	        }

	        client.on('change', function (time)   { applyConfig({time: time}) });
	        client.on('config', function (config) { applyConfig(config) });
	        client.on('error',  function (err)    { timer.emit('error', err) });
	      }
	    }

	    // create a master
	    if ('port' in options) {
	      if (server) {
	        server.destroy();
	        server = null;
	      }

	      port = options.port;
	      if (options.port) {
	        server = createMaster(timer.now, timer.config, options.port);
	        server.on('error', function (err) { timer.emit('error', err) });
	      }
	    }

	    // reschedule running timeouts
	    _schedule();

	    if (server) {
	      // broadcast changed config
	      server.broadcastConfig();
	    }
	  }

	  /**
	   * Reschedule all intervals after a new time has been set.
	   * @param {number} now
	   * @private
	   */
	  function _rescheduleIntervals(now) {
	    for (var i = 0; i < timeouts.length; i++) {
	      var timeout = timeouts[i];
	      if (timeout.type === TYPE.INTERVAL) {
	        _rescheduleInterval(timeout, now);
	      }
	    }
	  }

	  /**
	   * Reschedule the intervals after a new time has been set.
	   * @param {Object} timeout
	   * @param {number} now
	   * @private
	   */
	  function _rescheduleInterval(timeout, now) {
	    timeout.occurrence = Math.round((now - timeout.firstTime) / timeout.interval);
	    timeout.time = timeout.firstTime + timeout.occurrence * timeout.interval;
	  }

	  /**
	   * Add a timeout to the queue. After the queue has been changed, the queue
	   * must be rescheduled by executing _reschedule()
	   * @param {{id: number, type: number, time: number, callback: Function}} timeout
	   * @private
	   */
	  function _queueTimeout(timeout) {
	    // insert the new timeout at the right place in the array, sorted by time
	    if (timeouts.length > 0) {
	      var i = timeouts.length - 1;
	      while (i >= 0 && timeouts[i].time > timeout.time) {
	        i--;
	      }

	      // insert the new timeout in the queue. Note that the timeout is
	      // inserted *after* existing timeouts with the exact *same* time,
	      // so the order in which they are executed is deterministic
	      timeouts.splice(i + 1, 0, timeout);
	    }
	    else {
	      // queue is empty, append the new timeout
	      timeouts.push(timeout);
	    }
	  }

	  /**
	   * Execute a timeout
	   * @param {{id: number, type: number, time: number, callback: function}} timeout
	   * @param {function} [callback]
	   *             The callback is executed when the timeout's callback is
	   *             finished. Called without parameters
	   * @private
	   */
	  function _execTimeout(timeout, callback) {
	    // store the timeout in the queue with timeouts in progress
	    // it can be cleared when a clearTimeout is executed inside the callback
	    current[timeout.id] = timeout;

	    function finish() {
	      // in case of an interval we have to reschedule on next cycle
	      // interval must not be cleared while executing the callback
	      if (timeout.type === TYPE.INTERVAL && current[timeout.id]) {
	        timeout.occurrence++;
	        timeout.time = timeout.firstTime + timeout.occurrence * timeout.interval;
	        _queueTimeout(timeout);
	        //console.log('queue timeout', timer.getTime().toISOString(), new Date(timeout.time).toISOString(), timeout.occurrence) // TODO: cleanup
	      }

	      // remove the timeout from the queue with timeouts in progress
	      delete current[timeout.id];

	      callback && callback();
	    }

	    // execute the callback
	    try {
	      if (timeout.callback.length == 0) {
	        // synchronous timeout,  like `timer.setTimeout(function () {...}, delay)`
	        timeout.callback();
	        finish();
	      } else {
	        // asynchronous timeout, like `timer.setTimeout(function (done) {...; done(); }, delay)`
	        timeout.callback(finish);
	      }
	    } catch (err) {
	      // emit or log the error
	      if (hasListeners(timer, 'error')) {
	        timer.emit('error', err);
	      }
	      else {
	        console.log('Error', err);
	      }

	      finish();
	    }
	  }

	  /**
	   * Remove all timeouts occurring before or on the provided time from the
	   * queue and return them.
	   * @param {number} time    A timestamp
	   * @returns {Array} returns an array containing all expired timeouts
	   * @private
	   */
	  function _getExpiredTimeouts(time) {
	    var i = 0;
	    while (i < timeouts.length && ((timeouts[i].time <= time) || !isFinite(timeouts[i].time))) {
	      i++;
	    }
	    var expired = timeouts.splice(0, i);

	    if (deterministic == false) {
	      // the array with expired timeouts is in deterministic order
	      // shuffle them
	      util.shuffle(expired);
	    }

	    return expired;
	  }

	  /**
	   * Reschedule all queued timeouts
	   * @private
	   */
	  function _schedule() {
	    // do not _schedule when there are timeouts in progress
	    // this can be the case with async timeouts in non-paced mode.
	    // _schedule will be executed again when all async timeouts are finished.
	    if (!paced && Object.keys(current).length > 0) {
	      return;
	    }

	    var next = timeouts[0];

	    // cancel timer when running
	    if (timeoutId) {
	      clearTimeout(timeoutId);
	      timeoutId = null;
	    }

	    if (running && next) {
	      // schedule next timeout
	      var time = next.time;
	      var delay = time - timer.now();
	      var realDelay = paced ? delay / rate : 0;

	      function onTimeout() {
	        // when running in non-paced mode, update the hyperTime to
	        // adjust the time of the current event
	        if (!paced) {
	          hyperTime = (time > hyperTime && isFinite(time)) ? time : hyperTime;
	        }

	        // grab all expired timeouts from the queue
	        var expired = _getExpiredTimeouts(time);
	        // note: expired.length can never be zero (on every change of the queue, we reschedule)

	        // execute all expired timeouts
	        if (paced) {
	          // in paced mode, we fire all timeouts in parallel,
	          // and don't await their completion (they can do async operations)
	          expired.forEach(function (timeout) {
	            _execTimeout(timeout);
	          });

	          // schedule the next round
	          _schedule();
	        }
	        else {
	          // in non-paced mode, we execute all expired timeouts serially,
	          // and wait for their completion in order to guarantee deterministic
	          // order of execution
	          function next() {
	            var timeout = expired.shift();
	            if (timeout) {
	              _execTimeout(timeout, next);
	            }
	            else {
	              // schedule the next round
	              _schedule();
	            }
	          }
	          next();
	        }
	      }

	      timeoutId = setTimeout(onTimeout, Math.round(realDelay));
	      // Note: Math.round(realDelay) is to defeat a bug in node.js v0.10.30,
	      //       see https://github.com/joyent/node/issues/8065
	    }
	  }

	  /**
	   * Convert a Date, number, or ISOString to a number timestamp,
	   * and validate whether it's a valid Date. The number Infinity is also
	   * accepted as a valid timestamp
	   * @param {Date | number | string} date
	   * @return {number} Returns a unix timestamp, a number
	   */
	  function toTimestamp(date) {
	    var value =
	        (typeof date === 'number') ? date :           // number
	        (date instanceof Date)     ? date.valueOf() : // Date
	        new Date(date).valueOf();                     // ISOString, momentjs, ...

	    if (isNaN(value)) {
	      throw new TypeError('Invalid date ' + JSON.stringify(date) + '. ' +
	          'Date, number, or ISOString expected');
	    }

	    return value;
	  }

	  Object.defineProperty(timer, 'running', {
	    get: function () {
	      return running;
	    }
	  });

	  timer.config(options);  // apply options
	  timer.continue();       // start the timer

	  return timer;
	}

	module.exports = hypertimer;


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var d        = __webpack_require__(19)
	  , callable = __webpack_require__(32)

	  , apply = Function.prototype.apply, call = Function.prototype.call
	  , create = Object.create, defineProperty = Object.defineProperty
	  , defineProperties = Object.defineProperties
	  , hasOwnProperty = Object.prototype.hasOwnProperty
	  , descriptor = { configurable: true, enumerable: false, writable: true }

	  , on, once, off, emit, methods, descriptors, base;

	on = function (type, listener) {
		var data;

		callable(listener);

		if (!hasOwnProperty.call(this, '__ee__')) {
			data = descriptor.value = create(null);
			defineProperty(this, '__ee__', descriptor);
			descriptor.value = null;
		} else {
			data = this.__ee__;
		}
		if (!data[type]) data[type] = listener;
		else if (typeof data[type] === 'object') data[type].push(listener);
		else data[type] = [data[type], listener];

		return this;
	};

	once = function (type, listener) {
		var once, self;

		callable(listener);
		self = this;
		on.call(this, type, once = function () {
			off.call(self, type, once);
			apply.call(listener, this, arguments);
		});

		once.__eeOnceListener__ = listener;
		return this;
	};

	off = function (type, listener) {
		var data, listeners, candidate, i;

		callable(listener);

		if (!hasOwnProperty.call(this, '__ee__')) return this;
		data = this.__ee__;
		if (!data[type]) return this;
		listeners = data[type];

		if (typeof listeners === 'object') {
			for (i = 0; (candidate = listeners[i]); ++i) {
				if ((candidate === listener) ||
						(candidate.__eeOnceListener__ === listener)) {
					if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
					else listeners.splice(i, 1);
				}
			}
		} else {
			if ((listeners === listener) ||
					(listeners.__eeOnceListener__ === listener)) {
				delete data[type];
			}
		}

		return this;
	};

	emit = function (type) {
		var i, l, listener, listeners, args;

		if (!hasOwnProperty.call(this, '__ee__')) return;
		listeners = this.__ee__[type];
		if (!listeners) return;

		if (typeof listeners === 'object') {
			l = arguments.length;
			args = new Array(l - 1);
			for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

			listeners = listeners.slice();
			for (i = 0; (listener = listeners[i]); ++i) {
				apply.call(listener, this, args);
			}
		} else {
			switch (arguments.length) {
			case 1:
				call.call(listeners, this);
				break;
			case 2:
				call.call(listeners, this, arguments[1]);
				break;
			case 3:
				call.call(listeners, this, arguments[1], arguments[2]);
				break;
			default:
				l = arguments.length;
				args = new Array(l - 1);
				for (i = 1; i < l; ++i) {
					args[i - 1] = arguments[i];
				}
				apply.call(listeners, this, args);
			}
		}
	};

	methods = {
		on: on,
		once: once,
		off: off,
		emit: emit
	};

	descriptors = {
		on: d(on),
		once: d(once),
		off: d(off),
		emit: d(emit)
	};

	base = defineProperties({}, descriptors);

	module.exports = exports = function (o) {
		return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
	};
	exports.methods = methods;


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var assign        = __webpack_require__(20)
	  , normalizeOpts = __webpack_require__(27)
	  , isCallable    = __webpack_require__(28)
	  , contains      = __webpack_require__(29)

	  , d;

	d = module.exports = function (dscr, value/*, options*/) {
		var c, e, w, options, desc;
		if ((arguments.length < 2) || (typeof dscr !== 'string')) {
			options = value;
			value = dscr;
			dscr = null;
		} else {
			options = arguments[2];
		}
		if (dscr == null) {
			c = w = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
			w = contains.call(dscr, 'w');
		}

		desc = { value: value, configurable: c, enumerable: e, writable: w };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};

	d.gs = function (dscr, get, set/*, options*/) {
		var c, e, options, desc;
		if (typeof dscr !== 'string') {
			options = set;
			set = get;
			get = dscr;
			dscr = null;
		} else {
			options = arguments[3];
		}
		if (get == null) {
			get = undefined;
		} else if (!isCallable(get)) {
			options = get;
			get = set = undefined;
		} else if (set == null) {
			set = undefined;
		} else if (!isCallable(set)) {
			options = set;
			set = undefined;
		}
		if (dscr == null) {
			c = true;
			e = false;
		} else {
			c = contains.call(dscr, 'c');
			e = contains.call(dscr, 'e');
		}

		desc = { get: get, set: set, configurable: c, enumerable: e };
		return !options ? desc : assign(normalizeOpts(options), desc);
	};


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(21)()
		? Object.assign
		: __webpack_require__(22);


/***/ },
/* 21 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function () {
		var assign = Object.assign, obj;
		if (typeof assign !== 'function') return false;
		obj = { foo: 'raz' };
		assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
		return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
	};


/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var keys  = __webpack_require__(23)
	  , value = __webpack_require__(26)

	  , max = Math.max;

	module.exports = function (dest, src/*, …srcn*/) {
		var error, i, l = max(arguments.length, 2), assign;
		dest = Object(value(dest));
		assign = function (key) {
			try { dest[key] = src[key]; } catch (e) {
				if (!error) error = e;
			}
		};
		for (i = 1; i < l; ++i) {
			src = arguments[i];
			keys(src).forEach(assign);
		}
		if (error !== undefined) throw error;
		return dest;
	};


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(24)()
		? Object.keys
		: __webpack_require__(25);


/***/ },
/* 24 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function () {
		try {
			Object.keys('primitive');
			return true;
		} catch (e) { return false; }
	};


/***/ },
/* 25 */
/***/ function(module, exports) {

	'use strict';

	var keys = Object.keys;

	module.exports = function (object) {
		return keys(object == null ? object : Object(object));
	};


/***/ },
/* 26 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function (value) {
		if (value == null) throw new TypeError("Cannot use null or undefined");
		return value;
	};


/***/ },
/* 27 */
/***/ function(module, exports) {

	'use strict';

	var forEach = Array.prototype.forEach, create = Object.create;

	var process = function (src, obj) {
		var key;
		for (key in src) obj[key] = src[key];
	};

	module.exports = function (options/*, …options*/) {
		var result = create(null);
		forEach.call(arguments, function (options) {
			if (options == null) return;
			process(Object(options), result);
		});
		return result;
	};


/***/ },
/* 28 */
/***/ function(module, exports) {

	// Deprecated

	'use strict';

	module.exports = function (obj) { return typeof obj === 'function'; };


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(30)()
		? String.prototype.contains
		: __webpack_require__(31);


/***/ },
/* 30 */
/***/ function(module, exports) {

	'use strict';

	var str = 'razdwatrzy';

	module.exports = function () {
		if (typeof str.contains !== 'function') return false;
		return ((str.contains('dwa') === true) && (str.contains('foo') === false));
	};


/***/ },
/* 31 */
/***/ function(module, exports) {

	'use strict';

	var indexOf = String.prototype.indexOf;

	module.exports = function (searchString/*, position*/) {
		return indexOf.call(this, searchString, arguments[1]) > -1;
	};


/***/ },
/* 32 */
/***/ function(module, exports) {

	'use strict';

	module.exports = function (fn) {
		if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
		return fn;
	};


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var isEmpty = __webpack_require__(34)
	  , value   = __webpack_require__(26)

	  , hasOwnProperty = Object.prototype.hasOwnProperty;

	module.exports = function (obj/*, type*/) {
		var type;
		value(obj);
		type = arguments[1];
		if (arguments.length > 1) {
			return hasOwnProperty.call(obj, '__ee__') && Boolean(obj.__ee__[type]);
		}
		return obj.hasOwnProperty('__ee__') && !isEmpty(obj.__ee__);
	};


/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var value = __webpack_require__(26)

	  , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

	module.exports = function (obj) {
		var i;
		value(obj);
		for (i in obj) { //jslint: ignore
			if (propertyIsEnumerable.call(obj, i)) return false;
		}
		return true;
	};


/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

	var WebSocket = __webpack_require__(36);
	var emitter = __webpack_require__(38);
	var debug = __webpack_require__(47)('hypertimer:master');

	exports.createMaster = function (now, config, port) {
	  var master = new WebSocket.Server({port: port});

	  master.on('connection', function (ws) {
	    debug('new connection');

	    var _emitter = emitter(ws);

	    // ping timesync messages (for the timesync module)
	    _emitter.on('time', function (data, callback) {
	      var time = now();
	      callback(time);
	      debug('send time ' + new Date(time).toISOString());
	    });

	    // send the masters config to the new connection
	    var config = sanitizedConfig();
	    debug('send config', config);
	    _emitter.send('config', config);

	    ws.emitter = _emitter; // used by broadcast
	  });

	  master.broadcast = function (event, data) {
	    debug('broadcast', event, data);
	    master.clients.forEach(function (client) {
	      client.emitter.send(event, data);
	    });
	  };

	  master.broadcastConfig = function () {
	    master.broadcast('config', sanitizedConfig());
	  };

	  master.destroy = function() {
	    master.close();
	    debug('destroyed');
	  };

	  function sanitizedConfig() {
	    var curr = config();
	    delete curr.time;
	    delete curr.master;
	    delete curr.port;
	    return curr;
	  }

	  debug('listening at ws://localhost:' + port);

	  return master;
	};


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') ?
	    __webpack_require__(37) :
	    window.WebSocket;


/***/ },
/* 37 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_37__;

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	// Turn a WebSocket in an event emitter.
	var eventEmitter = __webpack_require__(18);
	var Promise = __webpack_require__(39);
	var debug = __webpack_require__(47)('hypertimer:socket');

	var TIMEOUT = 60000; // ms
	// TODO: make timeout a configuration setting

	module.exports = function (socket) {
	  var emitter = eventEmitter({
	    socket: socket,
	    send: send,
	    request: request
	  });

	  /**
	   * Send an event
	   * @param {string} event
	   * @param {*} data
	   */
	  function send (event, data) {
	    var envelope = {
	      event: event,
	      data: data
	    };
	    debug('send', envelope);
	    socket.send(JSON.stringify(envelope));
	  }

	  /**
	   * Request an event, await a response
	   * @param {string} event
	   * @param {*} data
	   * @return {Promise} Returns a promise which resolves with the reply
	   */
	  function request (event, data) {
	    return new Promise(function (resolve, reject) {
	      // put the data in an envelope with id
	      var id = getId();
	      var envelope = {
	        event: event,
	        id: id,
	        data: data
	      };

	      // add the request to the list with requests in progress
	      queue[id] = {
	        resolve: resolve,
	        reject: reject,
	        timeout: setTimeout(function () {
	          delete queue[id];
	          reject(new Error('Timeout'));
	        }, TIMEOUT)
	      };

	      debug('request', envelope);
	      socket.send(JSON.stringify(envelope));
	    }).catch(function (err) {console.log('ERROR', err)});
	  }

	  /**
	   * Event handler, handles incoming messages
	   * @param {Object} event
	   */
	  socket.onmessage = function (event) {
	    var data = event.data;
	    var envelope = JSON.parse(data);
	    debug('receive', envelope);

	    // match the request from the id in the response
	    var request = queue[envelope.id];
	    if (request) {
	      // incoming response
	      clearTimeout(request.timeout);
	      delete queue[envelope.id];
	      request.resolve(envelope.data);
	    }
	    else if ('id' in envelope) {
	      // incoming request
	      emitter.emit(envelope.event, envelope.data, function (reply) {
	        var response = {
	          id: envelope.id,
	          data: reply
	        };

	        if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
	          debug('reply', response);
	          socket.send(JSON.stringify(response));
	        }
	        else {
	          debug('cancel reply', response, '(socket is closed)');
	        }
	      });
	    }
	    else {
	      // regular incoming message
	      emitter.emit(envelope.event, envelope.data);
	    }
	  };

	  var queue = {};   // queue with requests in progress

	  // get a unique id (simple counter)
	  function getId () {
	    return _id++;
	  }
	  var _id = 0;

	  return emitter;
	};


/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = (typeof window === 'undefined' || typeof window.Promise === 'undefined') ?
	    __webpack_require__(40) :
	    window.Promise;


/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(41)


/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(42);
	__webpack_require__(43);
	__webpack_require__(44);
	__webpack_require__(45);
	__webpack_require__(46);


/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var asap = __webpack_require__(5);

	function noop() {}

	// States:
	//
	// 0 - pending
	// 1 - fulfilled with _value
	// 2 - rejected with _value
	// 3 - adopted the state of another promise, _value
	//
	// once the state is no longer pending (0) it is immutable

	// All `_` prefixed properties will be reduced to `_{random number}`
	// at build time to obfuscate them and discourage their use.
	// We don't use symbols or Object.defineProperty to fully hide them
	// because the performance isn't good enough.


	// to avoid using try/catch inside critical functions, we
	// extract them to here.
	var LAST_ERROR = null;
	var IS_ERROR = {};
	function getThen(obj) {
	  try {
	    return obj.then;
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}

	function tryCallOne(fn, a) {
	  try {
	    return fn(a);
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}
	function tryCallTwo(fn, a, b) {
	  try {
	    fn(a, b);
	  } catch (ex) {
	    LAST_ERROR = ex;
	    return IS_ERROR;
	  }
	}

	module.exports = Promise;

	function Promise(fn) {
	  if (typeof this !== 'object') {
	    throw new TypeError('Promises must be constructed via new');
	  }
	  if (typeof fn !== 'function') {
	    throw new TypeError('not a function');
	  }
	  this._37 = 0;
	  this._12 = null;
	  this._59 = [];
	  if (fn === noop) return;
	  doResolve(fn, this);
	}
	Promise._99 = noop;

	Promise.prototype.then = function(onFulfilled, onRejected) {
	  if (this.constructor !== Promise) {
	    return safeThen(this, onFulfilled, onRejected);
	  }
	  var res = new Promise(noop);
	  handle(this, new Handler(onFulfilled, onRejected, res));
	  return res;
	};

	function safeThen(self, onFulfilled, onRejected) {
	  return new self.constructor(function (resolve, reject) {
	    var res = new Promise(noop);
	    res.then(resolve, reject);
	    handle(self, new Handler(onFulfilled, onRejected, res));
	  });
	};
	function handle(self, deferred) {
	  while (self._37 === 3) {
	    self = self._12;
	  }
	  if (self._37 === 0) {
	    self._59.push(deferred);
	    return;
	  }
	  asap(function() {
	    var cb = self._37 === 1 ? deferred.onFulfilled : deferred.onRejected;
	    if (cb === null) {
	      if (self._37 === 1) {
	        resolve(deferred.promise, self._12);
	      } else {
	        reject(deferred.promise, self._12);
	      }
	      return;
	    }
	    var ret = tryCallOne(cb, self._12);
	    if (ret === IS_ERROR) {
	      reject(deferred.promise, LAST_ERROR);
	    } else {
	      resolve(deferred.promise, ret);
	    }
	  });
	}
	function resolve(self, newValue) {
	  // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
	  if (newValue === self) {
	    return reject(
	      self,
	      new TypeError('A promise cannot be resolved with itself.')
	    );
	  }
	  if (
	    newValue &&
	    (typeof newValue === 'object' || typeof newValue === 'function')
	  ) {
	    var then = getThen(newValue);
	    if (then === IS_ERROR) {
	      return reject(self, LAST_ERROR);
	    }
	    if (
	      then === self.then &&
	      newValue instanceof Promise
	    ) {
	      self._37 = 3;
	      self._12 = newValue;
	      finale(self);
	      return;
	    } else if (typeof then === 'function') {
	      doResolve(then.bind(newValue), self);
	      return;
	    }
	  }
	  self._37 = 1;
	  self._12 = newValue;
	  finale(self);
	}

	function reject(self, newValue) {
	  self._37 = 2;
	  self._12 = newValue;
	  finale(self);
	}
	function finale(self) {
	  for (var i = 0; i < self._59.length; i++) {
	    handle(self, self._59[i]);
	  }
	  self._59 = null;
	}

	function Handler(onFulfilled, onRejected, promise){
	  this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
	  this.onRejected = typeof onRejected === 'function' ? onRejected : null;
	  this.promise = promise;
	}

	/**
	 * Take a potentially misbehaving resolver function and make sure
	 * onFulfilled and onRejected are only called once.
	 *
	 * Makes no guarantees about asynchrony.
	 */
	function doResolve(fn, promise) {
	  var done = false;
	  var res = tryCallTwo(fn, function (value) {
	    if (done) return;
	    done = true;
	    resolve(promise, value);
	  }, function (reason) {
	    if (done) return;
	    done = true;
	    reject(promise, reason);
	  })
	  if (!done && res === IS_ERROR) {
	    done = true;
	    reject(promise, LAST_ERROR);
	  }
	}


/***/ },
/* 43 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(42);

	module.exports = Promise;
	Promise.prototype.done = function (onFulfilled, onRejected) {
	  var self = arguments.length ? this.then.apply(this, arguments) : this;
	  self.then(null, function (err) {
	    setTimeout(function () {
	      throw err;
	    }, 0);
	  });
	};


/***/ },
/* 44 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(42);

	module.exports = Promise;
	Promise.prototype['finally'] = function (f) {
	  return this.then(function (value) {
	    return Promise.resolve(f()).then(function () {
	      return value;
	    });
	  }, function (err) {
	    return Promise.resolve(f()).then(function () {
	      throw err;
	    });
	  });
	};


/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	//This file contains the ES6 extensions to the core Promises/A+ API

	var Promise = __webpack_require__(42);

	module.exports = Promise;

	/* Static Functions */

	var TRUE = valuePromise(true);
	var FALSE = valuePromise(false);
	var NULL = valuePromise(null);
	var UNDEFINED = valuePromise(undefined);
	var ZERO = valuePromise(0);
	var EMPTYSTRING = valuePromise('');

	function valuePromise(value) {
	  var p = new Promise(Promise._99);
	  p._37 = 1;
	  p._12 = value;
	  return p;
	}
	Promise.resolve = function (value) {
	  if (value instanceof Promise) return value;

	  if (value === null) return NULL;
	  if (value === undefined) return UNDEFINED;
	  if (value === true) return TRUE;
	  if (value === false) return FALSE;
	  if (value === 0) return ZERO;
	  if (value === '') return EMPTYSTRING;

	  if (typeof value === 'object' || typeof value === 'function') {
	    try {
	      var then = value.then;
	      if (typeof then === 'function') {
	        return new Promise(then.bind(value));
	      }
	    } catch (ex) {
	      return new Promise(function (resolve, reject) {
	        reject(ex);
	      });
	    }
	  }
	  return valuePromise(value);
	};

	Promise.all = function (arr) {
	  var args = Array.prototype.slice.call(arr);

	  return new Promise(function (resolve, reject) {
	    if (args.length === 0) return resolve([]);
	    var remaining = args.length;
	    function res(i, val) {
	      if (val && (typeof val === 'object' || typeof val === 'function')) {
	        if (val instanceof Promise && val.then === Promise.prototype.then) {
	          while (val._37 === 3) {
	            val = val._12;
	          }
	          if (val._37 === 1) return res(i, val._12);
	          if (val._37 === 2) reject(val._12);
	          val.then(function (val) {
	            res(i, val);
	          }, reject);
	          return;
	        } else {
	          var then = val.then;
	          if (typeof then === 'function') {
	            var p = new Promise(then.bind(val));
	            p.then(function (val) {
	              res(i, val);
	            }, reject);
	            return;
	          }
	        }
	      }
	      args[i] = val;
	      if (--remaining === 0) {
	        resolve(args);
	      }
	    }
	    for (var i = 0; i < args.length; i++) {
	      res(i, args[i]);
	    }
	  });
	};

	Promise.reject = function (value) {
	  return new Promise(function (resolve, reject) {
	    reject(value);
	  });
	};

	Promise.race = function (values) {
	  return new Promise(function (resolve, reject) {
	    values.forEach(function(value){
	      Promise.resolve(value).then(resolve, reject);
	    });
	  });
	};

	/* Prototype Methods */

	Promise.prototype['catch'] = function (onRejected) {
	  return this.then(null, onRejected);
	};


/***/ },
/* 46 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	// This file contains then/promise specific extensions that are only useful
	// for node.js interop

	var Promise = __webpack_require__(42);
	var asap = __webpack_require__(10);

	module.exports = Promise;

	/* Static Functions */

	Promise.denodeify = function (fn, argumentCount) {
	  argumentCount = argumentCount || Infinity;
	  return function () {
	    var self = this;
	    var args = Array.prototype.slice.call(arguments, 0,
	        argumentCount > 0 ? argumentCount : 0);
	    return new Promise(function (resolve, reject) {
	      args.push(function (err, res) {
	        if (err) reject(err);
	        else resolve(res);
	      })
	      var res = fn.apply(self, args);
	      if (res &&
	        (
	          typeof res === 'object' ||
	          typeof res === 'function'
	        ) &&
	        typeof res.then === 'function'
	      ) {
	        resolve(res);
	      }
	    })
	  }
	}
	Promise.nodeify = function (fn) {
	  return function () {
	    var args = Array.prototype.slice.call(arguments);
	    var callback =
	      typeof args[args.length - 1] === 'function' ? args.pop() : null;
	    var ctx = this;
	    try {
	      return fn.apply(this, arguments).nodeify(callback, ctx);
	    } catch (ex) {
	      if (callback === null || typeof callback == 'undefined') {
	        return new Promise(function (resolve, reject) {
	          reject(ex);
	        });
	      } else {
	        asap(function () {
	          callback.call(ctx, ex);
	        })
	      }
	    }
	  }
	}

	Promise.prototype.nodeify = function (callback, ctx) {
	  if (typeof callback != 'function') return this;

	  this.then(function (value) {
	    asap(function () {
	      callback.call(ctx, null, value);
	    });
	  }, function (err) {
	    asap(function () {
	      callback.call(ctx, err);
	    });
	  });
	}


/***/ },
/* 47 */
/***/ function(module, exports, __webpack_require__) {

	var Debug = typeof window !== 'undefined' ? window.Debug : __webpack_require__(48);

	module.exports = Debug || function () {
	  // empty stub when in the browser
	  return function () {};
	};


/***/ },
/* 48 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the web browser implementation of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = __webpack_require__(49);
	exports.log = log;
	exports.formatArgs = formatArgs;
	exports.save = save;
	exports.load = load;
	exports.useColors = useColors;
	exports.storage = 'undefined' != typeof chrome
	               && 'undefined' != typeof chrome.storage
	                  ? chrome.storage.local
	                  : localstorage();

	/**
	 * Colors.
	 */

	exports.colors = [
	  'lightseagreen',
	  'forestgreen',
	  'goldenrod',
	  'dodgerblue',
	  'darkorchid',
	  'crimson'
	];

	/**
	 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
	 * and the Firebug extension (any Firefox version) are known
	 * to support "%c" CSS customizations.
	 *
	 * TODO: add a `localStorage` variable to explicitly enable/disable colors
	 */

	function useColors() {
	  // is webkit? http://stackoverflow.com/a/16459606/376773
	  return ('WebkitAppearance' in document.documentElement.style) ||
	    // is firebug? http://stackoverflow.com/a/398120/376773
	    (window.console && (console.firebug || (console.exception && console.table))) ||
	    // is firefox >= v31?
	    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
	    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
	}

	/**
	 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
	 */

	exports.formatters.j = function(v) {
	  return JSON.stringify(v);
	};


	/**
	 * Colorize log arguments if enabled.
	 *
	 * @api public
	 */

	function formatArgs() {
	  var args = arguments;
	  var useColors = this.useColors;

	  args[0] = (useColors ? '%c' : '')
	    + this.namespace
	    + (useColors ? ' %c' : ' ')
	    + args[0]
	    + (useColors ? '%c ' : ' ')
	    + '+' + exports.humanize(this.diff);

	  if (!useColors) return args;

	  var c = 'color: ' + this.color;
	  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

	  // the final "%c" is somewhat tricky, because there could be other
	  // arguments passed either before or after the %c, so we need to
	  // figure out the correct index to insert the CSS into
	  var index = 0;
	  var lastC = 0;
	  args[0].replace(/%[a-z%]/g, function(match) {
	    if ('%%' === match) return;
	    index++;
	    if ('%c' === match) {
	      // we only are interested in the *last* %c
	      // (the user may have provided their own)
	      lastC = index;
	    }
	  });

	  args.splice(lastC, 0, c);
	  return args;
	}

	/**
	 * Invokes `console.log()` when available.
	 * No-op when `console.log` is not a "function".
	 *
	 * @api public
	 */

	function log() {
	  // this hackery is required for IE8/9, where
	  // the `console.log` function doesn't have 'apply'
	  return 'object' === typeof console
	    && console.log
	    && Function.prototype.apply.call(console.log, console, arguments);
	}

	/**
	 * Save `namespaces`.
	 *
	 * @param {String} namespaces
	 * @api private
	 */

	function save(namespaces) {
	  try {
	    if (null == namespaces) {
	      exports.storage.removeItem('debug');
	    } else {
	      exports.storage.debug = namespaces;
	    }
	  } catch(e) {}
	}

	/**
	 * Load `namespaces`.
	 *
	 * @return {String} returns the previously persisted debug modes
	 * @api private
	 */

	function load() {
	  var r;
	  try {
	    r = exports.storage.debug;
	  } catch(e) {}
	  return r;
	}

	/**
	 * Enable namespaces listed in `localStorage.debug` initially.
	 */

	exports.enable(load());

	/**
	 * Localstorage attempts to return the localstorage.
	 *
	 * This is necessary because safari throws
	 * when a user disables cookies/localstorage
	 * and you attempt to access it.
	 *
	 * @return {LocalStorage}
	 * @api private
	 */

	function localstorage(){
	  try {
	    return window.localStorage;
	  } catch (e) {}
	}


/***/ },
/* 49 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * This is the common logic for both the Node.js and web browser
	 * implementations of `debug()`.
	 *
	 * Expose `debug()` as the module.
	 */

	exports = module.exports = debug;
	exports.coerce = coerce;
	exports.disable = disable;
	exports.enable = enable;
	exports.enabled = enabled;
	exports.humanize = __webpack_require__(50);

	/**
	 * The currently active debug mode names, and names to skip.
	 */

	exports.names = [];
	exports.skips = [];

	/**
	 * Map of special "%n" handling functions, for the debug "format" argument.
	 *
	 * Valid key names are a single, lowercased letter, i.e. "n".
	 */

	exports.formatters = {};

	/**
	 * Previously assigned color.
	 */

	var prevColor = 0;

	/**
	 * Previous log timestamp.
	 */

	var prevTime;

	/**
	 * Select a color.
	 *
	 * @return {Number}
	 * @api private
	 */

	function selectColor() {
	  return exports.colors[prevColor++ % exports.colors.length];
	}

	/**
	 * Create a debugger with the given `namespace`.
	 *
	 * @param {String} namespace
	 * @return {Function}
	 * @api public
	 */

	function debug(namespace) {

	  // define the `disabled` version
	  function disabled() {
	  }
	  disabled.enabled = false;

	  // define the `enabled` version
	  function enabled() {

	    var self = enabled;

	    // set `diff` timestamp
	    var curr = +new Date();
	    var ms = curr - (prevTime || curr);
	    self.diff = ms;
	    self.prev = prevTime;
	    self.curr = curr;
	    prevTime = curr;

	    // add the `color` if not set
	    if (null == self.useColors) self.useColors = exports.useColors();
	    if (null == self.color && self.useColors) self.color = selectColor();

	    var args = Array.prototype.slice.call(arguments);

	    args[0] = exports.coerce(args[0]);

	    if ('string' !== typeof args[0]) {
	      // anything else let's inspect with %o
	      args = ['%o'].concat(args);
	    }

	    // apply any `formatters` transformations
	    var index = 0;
	    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
	      // if we encounter an escaped % then don't increase the array index
	      if (match === '%%') return match;
	      index++;
	      var formatter = exports.formatters[format];
	      if ('function' === typeof formatter) {
	        var val = args[index];
	        match = formatter.call(self, val);

	        // now we need to remove `args[index]` since it's inlined in the `format`
	        args.splice(index, 1);
	        index--;
	      }
	      return match;
	    });

	    if ('function' === typeof exports.formatArgs) {
	      args = exports.formatArgs.apply(self, args);
	    }
	    var logFn = enabled.log || exports.log || console.log.bind(console);
	    logFn.apply(self, args);
	  }
	  enabled.enabled = true;

	  var fn = exports.enabled(namespace) ? enabled : disabled;

	  fn.namespace = namespace;

	  return fn;
	}

	/**
	 * Enables a debug mode by namespaces. This can include modes
	 * separated by a colon and wildcards.
	 *
	 * @param {String} namespaces
	 * @api public
	 */

	function enable(namespaces) {
	  exports.save(namespaces);

	  var split = (namespaces || '').split(/[\s,]+/);
	  var len = split.length;

	  for (var i = 0; i < len; i++) {
	    if (!split[i]) continue; // ignore empty strings
	    namespaces = split[i].replace(/\*/g, '.*?');
	    if (namespaces[0] === '-') {
	      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
	    } else {
	      exports.names.push(new RegExp('^' + namespaces + '$'));
	    }
	  }
	}

	/**
	 * Disable debug output.
	 *
	 * @api public
	 */

	function disable() {
	  exports.enable('');
	}

	/**
	 * Returns true if the given mode name is enabled, false otherwise.
	 *
	 * @param {String} name
	 * @return {Boolean}
	 * @api public
	 */

	function enabled(name) {
	  var i, len;
	  for (i = 0, len = exports.skips.length; i < len; i++) {
	    if (exports.skips[i].test(name)) {
	      return false;
	    }
	  }
	  for (i = 0, len = exports.names.length; i < len; i++) {
	    if (exports.names[i].test(name)) {
	      return true;
	    }
	  }
	  return false;
	}

	/**
	 * Coerce `val`.
	 *
	 * @param {Mixed} val
	 * @return {Mixed}
	 * @api private
	 */

	function coerce(val) {
	  if (val instanceof Error) return val.stack || val.message;
	  return val;
	}


/***/ },
/* 50 */
/***/ function(module, exports) {

	/**
	 * Helpers.
	 */

	var s = 1000;
	var m = s * 60;
	var h = m * 60;
	var d = h * 24;
	var y = d * 365.25;

	/**
	 * Parse or format the given `val`.
	 *
	 * Options:
	 *
	 *  - `long` verbose formatting [false]
	 *
	 * @param {String|Number} val
	 * @param {Object} options
	 * @return {String|Number}
	 * @api public
	 */

	module.exports = function(val, options){
	  options = options || {};
	  if ('string' == typeof val) return parse(val);
	  return options.long
	    ? long(val)
	    : short(val);
	};

	/**
	 * Parse the given `str` and return milliseconds.
	 *
	 * @param {String} str
	 * @return {Number}
	 * @api private
	 */

	function parse(str) {
	  str = '' + str;
	  if (str.length > 10000) return;
	  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
	  if (!match) return;
	  var n = parseFloat(match[1]);
	  var type = (match[2] || 'ms').toLowerCase();
	  switch (type) {
	    case 'years':
	    case 'year':
	    case 'yrs':
	    case 'yr':
	    case 'y':
	      return n * y;
	    case 'days':
	    case 'day':
	    case 'd':
	      return n * d;
	    case 'hours':
	    case 'hour':
	    case 'hrs':
	    case 'hr':
	    case 'h':
	      return n * h;
	    case 'minutes':
	    case 'minute':
	    case 'mins':
	    case 'min':
	    case 'm':
	      return n * m;
	    case 'seconds':
	    case 'second':
	    case 'secs':
	    case 'sec':
	    case 's':
	      return n * s;
	    case 'milliseconds':
	    case 'millisecond':
	    case 'msecs':
	    case 'msec':
	    case 'ms':
	      return n;
	  }
	}

	/**
	 * Short format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function short(ms) {
	  if (ms >= d) return Math.round(ms / d) + 'd';
	  if (ms >= h) return Math.round(ms / h) + 'h';
	  if (ms >= m) return Math.round(ms / m) + 'm';
	  if (ms >= s) return Math.round(ms / s) + 's';
	  return ms + 'ms';
	}

	/**
	 * Long format for `ms`.
	 *
	 * @param {Number} ms
	 * @return {String}
	 * @api private
	 */

	function long(ms) {
	  return plural(ms, d, 'day')
	    || plural(ms, h, 'hour')
	    || plural(ms, m, 'minute')
	    || plural(ms, s, 'second')
	    || ms + ' ms';
	}

	/**
	 * Pluralization helper.
	 */

	function plural(ms, n, name) {
	  if (ms < n) return;
	  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
	  return Math.ceil(ms / n) + ' ' + name + 's';
	}


/***/ },
/* 51 */
/***/ function(module, exports, __webpack_require__) {

	var WebSocket = __webpack_require__(36);
	var Promise = __webpack_require__(39);
	var debug = __webpack_require__(47)('hypertimer:slave');
	var emitter = __webpack_require__(38);
	var stat = __webpack_require__(52);
	var util = __webpack_require__(53);

	// TODO: make these constants configurable
	var INTERVAL = 3600000; // once an hour
	var DELAY = 1000;       // delay between individual requests
	var REPEAT = 5;         // number of times to request the time for determining latency

	exports.createSlave = function (url) {
	  var ws = new WebSocket(url);
	  var slave = emitter(ws);
	  var isFirst = true;
	  var isDestroyed = false;
	  var syncTimer = null;

	  ws.onopen = function () {
	    debug('connected');
	    sync();
	    syncTimer = setInterval(sync, INTERVAL);
	  };

	  slave.destroy = function () {
	    isDestroyed = true;

	    clearInterval(syncTimer);
	    syncTimer = null;

	    ws.close();

	    debug('destroyed');
	  };

	  /**
	   * Sync with the time of the master. Emits a 'change' message
	   * @private
	   */
	  function sync() {
	    // retrieve latency, then wait 1 sec
	    function getLatencyAndWait() {
	      var result = null;

	      if (isDestroyed) {
	        return Promise.resolve(result);
	      }

	      return getLatency(slave)
	          .then(function (latency) { result = latency })  // store the retrieved latency
	          .catch(function (err)    { console.log(err) })  // just log failed requests
	          .then(function () { return util.wait(DELAY) })  // wait 1 sec
	          .then(function () { return result});            // return the retrieved latency
	    }

	    return util
	        .repeat(getLatencyAndWait, REPEAT)
	        .then(function (all) {
	          debug('latencies', all);

	          // filter away failed requests
	          var latencies = all.filter(function (latency) {
	            return latency !== null;
	          });

	          // calculate the limit for outliers
	          var limit = stat.median(latencies) + stat.std(latencies);

	          // filter away outliers: all latencies largereq than the mean+std
	          var filtered = latencies.filter(function (latency) {
	            return latency < limit;
	          });

	          // return the mean latency
	          return (filtered.length > 0) ? stat.mean(filtered) : null;
	        })
	        .then(function (latency) {
	          if (isDestroyed) {
	            return Promise.resolve(null);
	          }
	          else {
	            return slave.request('time').then(function (timestamp) {
	              var time = timestamp + latency;
	              slave.emit('change', time);
	              return time;
	            });
	          }
	        })
	        .catch(function (err) {
	          slave.emit('error', err)
	        });
	  }

	  /**
	   * Request the time of the master and calculate the latency from the
	   * roundtrip time
	   * @param {{request: function}} emitter
	   * @returns {Promise.<number | null>} returns the latency
	   * @private
	   */
	  function getLatency(emitter) {
	    var start = Date.now();

	    return emitter.request('time')
	        .then(function (timestamp) {
	          var end = Date.now();
	          var latency = (end - start) / 2;
	          var time = timestamp + latency;

	          // apply the first ever retrieved offset immediately.
	          if (isFirst) {
	            isFirst = false;
	            emitter.emit('change', time);
	          }

	          return latency;
	        })
	  }

	  return slave;
	};



/***/ },
/* 52 */
/***/ function(module, exports) {

	// basic statistical functions

	exports.compare = function (a, b) {
	  return a > b ? 1 : a < b ? -1 : 0;
	};

	exports.add = function (a, b) {
	  return a + b;
	};

	exports.sum = function (arr) {
	  return arr.reduce(exports.add);
	};

	exports.mean = function (arr) {
	  return exports.sum(arr) / arr.length;
	};

	exports.std = function (arr) {
	  return Math.sqrt(exports.variance(arr));
	};

	exports.variance = function (arr) {
	  if (arr.length < 2) return 0;

	  var _mean = exports.mean(arr);
	  return arr
	          .map(function (x) {
	            return Math.pow(x - _mean, 2)
	          })
	          .reduce(exports.add) / (arr.length - 1);
	};

	exports.median = function (arr) {
	  if (arr.length < 2) return arr[0];

	  var sorted = arr.slice().sort(exports.compare);
	  if (sorted.length % 2 === 0) {
	    // even
	    return (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
	  }
	  else {
	    // odd
	    return arr[(arr.length - 1) / 2];
	  }
	};


/***/ },
/* 53 */
/***/ function(module, exports, __webpack_require__) {

	var Promise = __webpack_require__(39);

	/**
	 * Resolve a promise after a delay
	 * @param {number} delay    A delay in milliseconds
	 * @returns {Promise} Resolves after given delay
	 */
	exports.wait = function(delay) {
	  return new Promise(function (resolve) {
	    setTimeout(resolve, delay);
	  });
	};

	/**
	 * Repeat a given asynchronous function a number of times
	 * @param {function} fn   A function returning a promise
	 * @param {number} times
	 * @return {Promise}
	 */
	exports.repeat = function (fn, times) {
	  return new Promise(function (resolve, reject) {
	    var count = 0;
	    var results = [];

	    function recurse() {
	      if (count < times) {
	        count++;
	        fn().then(function (result) {
	          results.push(result);
	          recurse();
	        })
	      }
	      else {
	        resolve(results);
	      }
	    }

	    recurse();
	  });
	};

	/**
	 * Repeat an asynchronous callback function whilst
	 * @param {function} condition   A function returning true or false
	 * @param {function} callback    A callback returning a Promise
	 * @returns {Promise}
	 */
	exports.whilst = function (condition, callback) {
	  return new Promise(function (resolve, reject) {
	    function recurse() {
	      if (condition()) {
	        callback().then(function () {
	          recurse()
	        });
	      }
	      else {
	        resolve();
	      }
	    }

	    recurse();
	  });
	};


/***/ },
/* 54 */
/***/ function(module, exports) {

	
	/* istanbul ignore else */
	if (typeof Date.now === 'function') {
	  /**
	   * Helper function to get the current time
	   * @return {number} Current time
	   */
	  exports.systemNow = function () {
	    return Date.now();
	  }
	}
	else {
	  /**
	   * Helper function to get the current time
	   * @return {number} Current time
	   */
	  exports.systemNow = function () {
	    return new Date().valueOf();
	  }
	}

	/**
	 * Shuffle an array
	 *
	 * + Jonas Raoni Soares Silva
	 * @ http://jsfromhell.com/array/shuffle [v1.0]
	 *
	 * @param {Array} o   Array to be shuffled
	 * @returns {Array}   Returns the shuffled array
	 */
	exports.shuffle = function (o){
	  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	  return o;
	};


/***/ },
/* 55 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * A manager for loading and finding transports.
	 * @param {Array} [config]      Optional array containing configuration objects
	 *                             for transports.
	 * @constructor
	 */
	function TransportManager(config) {
	  this.transports = [];

	  if (config) {
	    this.load(config);
	  }
	}

	// map with all registered types of transports
	// each transport must register itself at the TransportManager using registerType.
	TransportManager.types = {};

	/**
	 * Register a new type of transport. This transport can then be loaded via
	 * configuration.
	 * @param {Transport.prototype} constructor     A transport constructor
	 */
	TransportManager.registerType = function (constructor) {
	  var type = constructor.prototype.type;
	  if (typeof constructor !== 'function') {
	    throw new Error('Constructor function expected');
	  }
	  if (!type) {
	    throw new Error('Field "prototype.type" missing in transport constructor');
	  }
	  if (type in TransportManager.types) {
	    if (TransportManager.types[type] !== constructor) {
	      throw new Error('Transport type "' + type + '" already exists');
	    }
	  }

	  TransportManager.types[type] = constructor;
	};

	/**
	 * Add a loaded transport to the manager
	 * @param {Transport} transport
	 * @return {Transport} returns the transport itself
	 */
	TransportManager.prototype.add = function (transport) {
	  this.transports.push(transport);
	  return transport;
	};

	/**
	 * Load one or multiple transports based on JSON configuration.
	 * New transports will be appended to current transports.
	 * @param {Object | Array} config
	 * @return {Transport | Transport[]} Returns the loaded transport(s)
	 */
	TransportManager.prototype.load = function (config) {
	  if (Array.isArray(config)) {
	    return config.map(this.load.bind(this));
	  }

	  var type = config.type;
	  if (!type) {
	    throw new Error('Property "type" missing');
	  }

	  var constructor = TransportManager.types[type];
	  if (!constructor) {
	    throw new Error('Unknown type of transport "' + type + '". ' +
	        'Choose from: ' + Object.keys(TransportManager.types).join(','))
	  }

	  var transport = new constructor(config);
	  this.transports.push(transport);
	  return transport;
	};

	/**
	 * Unload a transport.
	 * @param {Transport | Transport[] | string | string[]} transport
	 *              A Transport instance or the id of a transport, or an Array
	 *              with transports or transport ids.
	 */
	TransportManager.prototype.unload = function (transport) {
	  var _transport;
	  if (typeof transport === 'string') {
	    _transport = this.get(transport);
	  }
	  else if (Array.isArray(transport)) {
	    for (var i = 0; i < transport.length; i++) {
	      this.unload(transport[i]);
	    }
	  }
	  else {
	    _transport = transport;
	  }

	  if (_transport) {
	    _transport.close();

	    var index = this.transports.indexOf(_transport);
	    if (index !== -1) {
	      this.transports.splice(index, 1);
	    }
	  }
	};

	/**
	 * Get a transport by its id. The transport must have been created with an id
	 * @param {string} [id] The id of a transport
	 * @return {Transport} Returns the transport when found. Throws an error
	 *                     when not found.
	 */
	TransportManager.prototype.get = function (id) {
	  for (var i = 0; i < this.transports.length; i++) {
	    var transport = this.transports[i];
	    if (transport.id === id) {
	      return transport;
	    }
	  }

	  throw new Error('Transport with id "' + id + '" not found');
	};

	/**
	 * Get all transports.
	 * @return {Transport[]} Returns an array with all loaded transports.
	 */
	TransportManager.prototype.getAll = function () {
	  return this.transports.concat([]);
	};

	/**
	 * Find transports by type.
	 * @param {string} [type]   Type of the transport. Choose from 'amqp',
	 *                          'distribus', 'local', 'pubnub'.
	 * @return {Transport[]}    When type is defined, the all transports of this
	 *                          type are returned. When undefined, all transports
	 *                          are returned.
	 */
	TransportManager.prototype.getByType = function (type) {
	  if (type) {
	    if (!(type in TransportManager.types)) {
	      throw new Error('Unknown type of transport "' + type + '". ' +
	          'Choose from: ' + Object.keys(TransportManager.types).join(','))
	    }

	    return this.transports.filter(function (transport) {
	      return transport.type === type;
	    });
	  }
	  else {
	    return [].concat(this.transports);
	  }
	};

	/**
	 * Close all configured transports and remove them from the manager.
	 */
	TransportManager.prototype.clear = function () {
	  this.transports.forEach(function (transport) {
	    transport.close();
	  });
	  this.transports = [];
	};

	module.exports = TransportManager;


/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var babble = __webpack_require__(57);

	/**
	 * Create a Babble module for an agent.
	 * The agents _receive function is wrapped into a new handler.
	 * Creates a Babble instance with function `ask`, `tell`, `listen`, `listenOnce`
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Not applicable for BabbleModule
	 * @constructor
	 */
	function BabbleModule(agent, options) {
	  // create a new babbler
	  var babbler = babble.babbler(agent.id);
	  babbler.connect({
	    connect: function (params) {},
	    disconnect: function(token) {},
	    send: function (to, message) {
	      agent.send(to, message);
	    }
	  });
	  this.babbler = babbler;

	  // create a receive function for the agent
	  var receiveOriginal = agent._receive;
	  this._receive = function (from, message) {
	    babbler._receive(message);
	    // TODO: only propagate to receiveOriginal if the message is not handled by the babbler
	    return receiveOriginal.call(agent, from, message);
	  };
	}

	BabbleModule.prototype.type = 'babble';

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, ask: function, tell: function, listen: function, listenOnce: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	BabbleModule.prototype.mixin = function () {
	  var babbler = this.babbler;
	  return {
	    _receive: this._receive,
	    ask: babbler.ask.bind(babbler),
	    tell: babbler.tell.bind(babbler),
	    listen: babbler.listen.bind(babbler),
	    listenOnce: babbler.listenOnce.bind(babbler)
	  }
	};

	module.exports = BabbleModule;


/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	module.exports = __webpack_require__(58);


/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Babbler = __webpack_require__(59);

	var Tell = __webpack_require__(95);
	var Listen = __webpack_require__(96);
	var Then = __webpack_require__(93);
	var Decision = __webpack_require__(98);
	var IIf = __webpack_require__(97);

	/**
	 * Create a new babbler
	 * @param {String} id
	 * @return {Babbler} babbler
	 */
	exports.babbler = function (id) {
	  return new Babbler(id);
	};

	/**
	 * Create a control flow starting with a tell block
	 * @param {* | Function} [message] A static message or callback function
	 *                                 returning a message dynamically.
	 *                                 When `message` is a function, it will be
	 *                                 invoked as callback(message, context),
	 *                                 where `message` is the output from the
	 *                                 previous block in the chain, and `context` is
	 *                                 an object where state can be stored during a
	 *                                 conversation.
	 * @return {Tell} tell
	 */
	exports.tell = function (message) {
	  return new Tell(message);
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen.
	 * This is equivalent of doing `babble.tell(message).listen(callback)`
	 * @param {* | Function} message
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Last block in the created control flow
	 */
	exports.ask = function (message, callback) {
	  return exports
	      .tell(message)
	      .listen(callback);
	};

	/**
	 * Create a decision block and chain it to the current block.
	 *
	 * Syntax:
	 *
	 *     decide(choices)
	 *     decide(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param {Function | Object} arg1  Can be {function} decision or {Object} choices
	 * @param {Object} [arg2]           choices
	 * @return {Block} decision         The created decision block
	 */
	exports.decide = function (arg1, arg2) {
	  // TODO: test arguments.length > 2
	  return new Decision(arg1, arg2);
	};

	/**
	 * Listen for a message.
	 *
	 * Optionally a callback function can be provided, which is equivalent of
	 * doing `listen().then(callback)`.
	 *
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block}              Returns the created Listen block
	 */
	exports.listen = function(callback) {
	  var block = new Listen();
	  if (callback) {
	    return block.then(callback);
	  }
	  return block;
	};

	/**
	 * Create a control flow starting with a Then block
	 * @param {Function} callback   Invoked as callback(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 * @return {Then} then
	 */
	exports.then = function (callback) {
	  return new Then(callback);
	};

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @returns {Block}
	 */
	exports.iif = function (condition, trueBlock, falseBlock) {
	  return new IIf(condition, trueBlock, falseBlock);
	};

	// export the babbler prototype
	exports.Babbler = Babbler;

	// export all flow blocks
	exports.block = {
	  Block: __webpack_require__(92),
	  Then: __webpack_require__(93),
	  Decision: __webpack_require__(98),
	  IIf: __webpack_require__(97),
	  Listen: __webpack_require__(96),
	  Tell: __webpack_require__(95)
	};

	// export messagebus interfaces
	exports.messagebus = __webpack_require__(88);

	/**
	 * Babblify an actor. The babblified actor will be extended with functions
	 * `ask`, `tell`, and `listen`.
	 *
	 * Babble expects that messages sent via `actor.send(to, message)` will be
	 * delivered by the recipient on a function `actor.receive(from, message)`.
	 * Babble replaces the original `receive` with a new one, which is used to
	 * listen for all incoming messages. Messages ignored by babble are propagated
	 * to the original `receive` function.
	 *
	 * The actor can be restored in its original state using `unbabblify(actor)`.
	 *
	 * @param {Object} actor      The actor to be babblified. Must be an object
	 *                            containing functions `send(to, message)` and
	 *                            `receive(from, message)`.
	 * @param {Object} [params]   Optional parameters. Can contain properties:
	 *                            - id: string        The id for the babbler
	 *                            - send: string      The name of an alternative
	 *                                                send function available on
	 *                                                the actor.
	 *                            - receive: string The name of an alternative
	 *                                                receive function available
	 *                                                on the actor.
	 * @returns {Object}          Returns the babblified actor.
	 */
	exports.babblify = function (actor, params) {
	  var babblerId;
	  if (params && params.id !== undefined) {
	    babblerId = params.id;
	  }
	  else if (actor.id !== undefined) {
	    babblerId = actor.id
	  }
	  else {
	    throw new Error('Id missing. Ensure that either actor has a property "id", ' +
	        'or provide an id as a property in second argument params')
	  }

	  // validate actor
	  ['ask', 'tell', 'listen', 'listenOnce'].forEach(function (prop) {
	    if (actor[prop] !== undefined) {
	      throw new Error('Conflict: actor already has a property "' + prop + '"');
	    }
	  });

	  var sendName = params && params.send || 'send';
	  if (typeof actor[sendName] !== 'function') {
	    throw new Error('Missing function. ' +
	        'Function "' + sendName + '(to, message)" expected on actor or on params');
	  }

	  // create a new babbler
	  var babbler = exports.babbler(babblerId);

	  // attach receive function to the babbler
	  var receiveName = params && params.receive || 'receive';
	  var receiveOriginal = actor.hasOwnProperty(receiveName) ? actor[receiveName] : null;
	  if (receiveOriginal) {
	    actor[receiveName] = function (from, message) {
	      babbler._receive(message);
	      // TODO: only propagate to receiveOriginal if the message is not handled by the babbler
	      return receiveOriginal.call(actor, from, message);
	    };
	  }
	  else {
	    actor[receiveName] = function (from, message) {
	      return babbler._receive(message);
	    };
	  }

	  // attach send function to the babbler
	  babbler.send = function (to, message) {
	    // FIXME: there should be no need to send a message on next tick
	    setTimeout(function () {
	      actor[sendName](to, message)
	    }, 0)
	  };

	  // attach babbler functions and properties to the actor
	  actor.__babbler__ = {
	    babbler: babbler,
	    receiveOriginal: receiveOriginal,
	    receiveName: receiveName
	  };
	  actor.ask = babbler.ask.bind(babbler);
	  actor.tell = babbler.tell.bind(babbler);
	  actor.listen = babbler.listen.bind(babbler);
	  actor.listenOnce = babbler.listenOnce.bind(babbler);

	  return actor;
	};

	/**
	 * Unbabblify an actor.
	 * @param {Object} actor
	 * @return {Object} Returns the unbabblified actor.
	 */
	exports.unbabblify = function (actor) {
	  var __babbler__ = actor.__babbler__;
	  if (__babbler__) {
	    delete actor.__babbler__;
	    delete actor.ask;
	    delete actor.tell;
	    delete actor.listen;
	    delete actor.listenOnce;
	    delete actor[__babbler__.receiveName];

	    // restore any original receiveOriginal method
	    if (__babbler__.receiveOriginal) {
	      actor[__babbler__.receiveName] = __babbler__.receiveOriginal;
	    }
	  }

	  return actor;
	};


/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(60);
	var Promise = __webpack_require__(84).Promise;

	var messagebus = __webpack_require__(88);
	var Conversation = __webpack_require__(91);
	var Block = __webpack_require__(92);
	var Then = __webpack_require__(93);
	var Tell = __webpack_require__(95);
	var Listen = __webpack_require__(96);

	__webpack_require__(97); // append iif function to Block

	/**
	 * Babbler
	 * @param {String} id
	 * @constructor
	 */
	function Babbler (id) {
	  if (!(this instanceof Babbler)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (!id) {
	    throw new Error('id required');
	  }

	  this.id = id;
	  this.listeners = [];      // Array.<Listen>
	  this.conversations = {};  // Array.<Array.<Conversation>> all open conversations

	  this.connect(); // automatically connect to the local message bus
	}

	// type information
	Babbler.prototype.isBabbler = true;

	/**
	 * Connect to a message bus
	 * @param {{connect: function, disconnect: function, send: function}} [bus]
	 *          A messaging interface. Must have the following functions:
	 *          - connect(params: {id: string,
	 *            message: function, callback: function}) : string
	 *            must return a token to disconnects again.
	 *            parameter callback is optional.
	 *          - disconnect(token: string)
	 *            disconnect from a message bus.
	 *          - send(id: string, message: *)
	 *            send a message
	 *          A number of interfaces is provided under babble.messagebus.
	 *          Default interface is babble.messagebus['default']
	 * @return {Promise.<Babbler>}  Returns a Promise which resolves when the
	 *                              babbler is connected.
	 */
	Babbler.prototype.connect = function (bus) {
	  // disconnect (in case we are already connected)
	  this.disconnect();

	  if (!bus) {
	    bus = messagebus['default']();
	  }

	  // validate the message bus functions
	  if (typeof bus.connect !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'connect(params: {id: string, callback: function}) : string');
	  }
	  if (typeof bus.disconnect !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'disconnect(token: string)');
	  }
	  if (typeof bus.send !== 'function') {
	    throw new Error('message bus must contain a function ' +
	        'send(params: {id: string, message: *})');
	  }

	  // we return a promise, but we run the message.connect function immediately
	  // (outside of the Promise), so that synchronous connects are done without
	  // the need to await the promise to resolve on the next tick.
	  var _resolve = null;
	  var connected = new Promise(function (resolve, reject) {
	    _resolve = resolve;
	  });

	  var token = bus.connect({
	    id: this.id,
	    message: this._receive.bind(this),
	    callback: _resolve
	  });

	  // link functions to disconnect and send
	  this.disconnect = function () {
	    bus.disconnect(token);
	  };
	  this.send = bus.send;

	  // return a promise
	  return connected;
	};

	/**
	 * Handle an incoming message
	 * @param {{id: string, from: string, to: string, message: string}} envelope
	 * @private
	 */
	Babbler.prototype._receive = function (envelope) {
	  // ignore when envelope does not contain an id and message
	  if (!envelope || !('id' in envelope) || !('message' in envelope)) {
	    return;
	  }

	  // console.log('_receive', envelope) // TODO: cleanup

	  var me = this;
	  var id = envelope.id;
	  var conversations = this.conversations[id];
	  if (conversations && conversations.length) {
	    // directly deliver to all open conversations with this id
	    conversations.forEach(function (conversation) {
	      conversation.deliver(envelope);
	    })
	  }
	  else {
	    // start new conversations at each of the listeners
	    if (!conversations) {
	      conversations = [];
	    }
	    this.conversations[id] = conversations;

	    this.listeners.forEach(function (block) {
	      // create a new conversation
	      var conversation = new Conversation({
	        id: id,
	        self: me.id,
	        other: envelope.from,
	        context: {
	          from: envelope.from
	        },
	        send: me.send
	      });

	      // append this conversation to the list with conversations
	      conversations.push(conversation);

	      // deliver the first message to the new conversation
	      conversation.deliver(envelope);

	      // process the conversation
	      return me._process(block, conversation)
	          .then(function() {
	            // remove the conversation from the list again
	            var index = conversations.indexOf(conversation);
	            if (index !== -1) {
	              conversations.splice(index, 1);
	            }
	            if (conversations.length === 0) {
	              delete me.conversations[id];
	            }
	          });
	    });
	  }
	};

	/**
	 * Disconnect from the babblebox
	 */
	Babbler.prototype.disconnect = function () {
	  // by default, do nothing. The disconnect function will be overwritten
	  // when the Babbler is connected to a message bus.
	};

	/**
	 * Send a message
	 * @param {String} to  Id of a babbler
	 * @param {*} message  Any message. Message must be a stringifiable JSON object.
	 */
	Babbler.prototype.send = function (to, message) {
	  // send is overridden when running connect
	  throw new Error('Cannot send: not connected');
	};

	/**
	 * Listen for a specific event
	 *
	 * Providing a condition will only start the flow when condition is met,
	 * this is equivalent of doing `listen().iif(condition)`
	 *
	 * Providing a callback function is equivalent of doing either
	 * `listen(message).then(callback)` or `listen().iif(message).then(callback)`.
	 *
	 * @param {function | RegExp | String | *} [condition]
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Start block of a control flow.
	 */
	Babbler.prototype.listen = function (condition, callback) {
	  var listen = new Listen();
	  this.listeners.push(listen);

	  var block = listen;
	  if (condition) {
	    block = block.iif(condition);
	  }
	  if (callback) {
	    block = block.then(callback);
	  }
	  return block;
	};

	/**
	 * Listen for a specific event, and execute the flow once.
	 *
	 * Providing a condition will only start the flow when condition is met,
	 * this is equivalent of doing `listen().iif(condition)`
	 *
	 * Providing a callback function is equivalent of doing either
	 * `listen(message).then(callback)` or `listen().iif(message).then(callback)`.
	 *
	 * @param {function | RegExp | String | *} [condition]
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Start block of a control flow.
	 */
	Babbler.prototype.listenOnce = function (condition, callback) {
	  var listen = new Listen();
	  this.listeners.push(listen);

	  var me = this;
	  var block = listen;

	  if (condition) {
	    block = block.iif(condition);
	  }

	  block = block.then(function (message) {
	    // remove the flow from the listeners after fired once
	    var index = me.listeners.indexOf(listen);
	    if (index !== -1) {
	      me.listeners.splice(index, 1);
	    }
	    return message;
	  });

	  if (callback) {
	    block = block.then(callback);
	  }

	  return block;
	};

	/**
	 * Send a message to the other peer
	 * Creates a block Tell, and runs the block immediately.
	 * @param {String} to       Babbler id
	 * @param {Function | *} message
	 * @return {Block} block    Last block in the created control flow
	 */
	Babbler.prototype.tell = function (to, message) {
	  var me = this;
	  var cid = uuid.v4(); // create an id for this conversation

	  // create a new conversation
	  var conversation = new Conversation({
	    id: cid,
	    self: this.id,
	    other: to,
	    context: {
	      from: to
	    },
	    send: me.send
	  });
	  this.conversations[cid] = [conversation];

	  var block = new Tell(message);

	  // run the Tell block on the next tick, when the conversation flow is created
	  setTimeout(function () {
	    me._process(block, conversation)
	        .then(function () {
	          // cleanup the conversation
	          delete me.conversations[cid];
	    })
	  }, 0);

	  return block;
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen, and runs them immediately.
	 * This is equivalent of doing `Babbler.tell(to, message).listen(callback)`
	 * @param {String} to             Babbler id
	 * @param {* | Function} message  A message or a callback returning a message.
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block} block        Last block in the created control flow
	 */
	Babbler.prototype.ask = function (to, message, callback) {
	  return this
	      .tell(to, message)
	      .listen(callback);
	};

	/**
	 * Process a flow starting with `block`, given a conversation
	 * @param {Block} block
	 * @param {Conversation} conversation
	 * @return {Promise.<Conversation>} Resolves when the conversation is finished
	 * @private
	 */
	Babbler.prototype._process = function (block, conversation) {
	  return new Promise(function (resolve, reject) {
	    /**
	     * Process a block, given the conversation and a message which is chained
	     * from block to block.
	     * @param {Block} block
	     * @param {*} [message]
	     */
	    function process(block, message) {
	      //console.log('process', conversation.self, conversation.id, block.constructor.name, message) // TODO: cleanup

	      block.execute(conversation, message)
	          .then(function (next) {
	            if (next.block) {
	              // recursively evaluate the next block in the conversation flow
	              process(next.block, next.result);
	            }
	            else {
	              // we are done, this is the end of the conversation
	              resolve(conversation);
	            }
	          });
	    }

	    // process the first block
	    process(block);
	  });
	};

	module.exports = Babbler;


/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(Buffer) {//     uuid.js
	//
	//     Copyright (c) 2010-2012 Robert Kieffer
	//     MIT License - http://opensource.org/licenses/mit-license.php

	/*global window, require, define */
	(function(_window) {
	  'use strict';

	  // Unique ID creation requires a high quality random # generator.  We feature
	  // detect to determine the best RNG source, normalizing to a function that
	  // returns 128-bits of randomness, since that's what's usually required
	  var _rng, _mathRNG, _nodeRNG, _whatwgRNG, _previousRoot;

	  function setupBrowser() {
	    // Allow for MSIE11 msCrypto
	    var _crypto = _window.crypto || _window.msCrypto;

	    if (!_rng && _crypto && _crypto.getRandomValues) {
	      // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
	      //
	      // Moderately fast, high quality
	      try {
	        var _rnds8 = new Uint8Array(16);
	        _whatwgRNG = _rng = function whatwgRNG() {
	          _crypto.getRandomValues(_rnds8);
	          return _rnds8;
	        };
	        _rng();
	      } catch(e) {}
	    }

	    if (!_rng) {
	      // Math.random()-based (RNG)
	      //
	      // If all else fails, use Math.random().  It's fast, but is of unspecified
	      // quality.
	      var  _rnds = new Array(16);
	      _mathRNG = _rng = function() {
	        for (var i = 0, r; i < 16; i++) {
	          if ((i & 0x03) === 0) { r = Math.random() * 0x100000000; }
	          _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
	        }

	        return _rnds;
	      };
	      if ('undefined' !== typeof console && console.warn) {
	        console.warn("[SECURITY] node-uuid: crypto not usable, falling back to insecure Math.random()");
	      }
	    }
	  }

	  function setupNode() {
	    // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
	    //
	    // Moderately fast, high quality
	    if (true) {
	      try {
	        var _rb = __webpack_require__(65).randomBytes;
	        _nodeRNG = _rng = _rb && function() {return _rb(16);};
	        _rng();
	      } catch(e) {}
	    }
	  }

	  if (_window) {
	    setupBrowser();
	  } else {
	    setupNode();
	  }

	  // Buffer class to use
	  var BufferClass = ('function' === typeof Buffer) ? Buffer : Array;

	  // Maps for number <-> hex string conversion
	  var _byteToHex = [];
	  var _hexToByte = {};
	  for (var i = 0; i < 256; i++) {
	    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
	    _hexToByte[_byteToHex[i]] = i;
	  }

	  // **`parse()` - Parse a UUID into it's component bytes**
	  function parse(s, buf, offset) {
	    var i = (buf && offset) || 0, ii = 0;

	    buf = buf || [];
	    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
	      if (ii < 16) { // Don't overflow!
	        buf[i + ii++] = _hexToByte[oct];
	      }
	    });

	    // Zero out remaining bytes if string was short
	    while (ii < 16) {
	      buf[i + ii++] = 0;
	    }

	    return buf;
	  }

	  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
	  function unparse(buf, offset) {
	    var i = offset || 0, bth = _byteToHex;
	    return  bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] + '-' +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]] +
	            bth[buf[i++]] + bth[buf[i++]];
	  }

	  // **`v1()` - Generate time-based UUID**
	  //
	  // Inspired by https://github.com/LiosK/UUID.js
	  // and http://docs.python.org/library/uuid.html

	  // random #'s we need to init node and clockseq
	  var _seedBytes = _rng();

	  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
	  var _nodeId = [
	    _seedBytes[0] | 0x01,
	    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
	  ];

	  // Per 4.2.2, randomize (14 bit) clockseq
	  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

	  // Previous uuid creation time
	  var _lastMSecs = 0, _lastNSecs = 0;

	  // See https://github.com/broofa/node-uuid for API details
	  function v1(options, buf, offset) {
	    var i = buf && offset || 0;
	    var b = buf || [];

	    options = options || {};

	    var clockseq = (options.clockseq != null) ? options.clockseq : _clockseq;

	    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
	    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
	    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
	    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
	    var msecs = (options.msecs != null) ? options.msecs : new Date().getTime();

	    // Per 4.2.1.2, use count of uuid's generated during the current clock
	    // cycle to simulate higher resolution clock
	    var nsecs = (options.nsecs != null) ? options.nsecs : _lastNSecs + 1;

	    // Time since last uuid creation (in msecs)
	    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

	    // Per 4.2.1.2, Bump clockseq on clock regression
	    if (dt < 0 && options.clockseq == null) {
	      clockseq = clockseq + 1 & 0x3fff;
	    }

	    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
	    // time interval
	    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
	      nsecs = 0;
	    }

	    // Per 4.2.1.2 Throw error if too many uuids are requested
	    if (nsecs >= 10000) {
	      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
	    }

	    _lastMSecs = msecs;
	    _lastNSecs = nsecs;
	    _clockseq = clockseq;

	    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
	    msecs += 12219292800000;

	    // `time_low`
	    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
	    b[i++] = tl >>> 24 & 0xff;
	    b[i++] = tl >>> 16 & 0xff;
	    b[i++] = tl >>> 8 & 0xff;
	    b[i++] = tl & 0xff;

	    // `time_mid`
	    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
	    b[i++] = tmh >>> 8 & 0xff;
	    b[i++] = tmh & 0xff;

	    // `time_high_and_version`
	    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
	    b[i++] = tmh >>> 16 & 0xff;

	    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
	    b[i++] = clockseq >>> 8 | 0x80;

	    // `clock_seq_low`
	    b[i++] = clockseq & 0xff;

	    // `node`
	    var node = options.node || _nodeId;
	    for (var n = 0; n < 6; n++) {
	      b[i + n] = node[n];
	    }

	    return buf ? buf : unparse(b);
	  }

	  // **`v4()` - Generate random UUID**

	  // See https://github.com/broofa/node-uuid for API details
	  function v4(options, buf, offset) {
	    // Deprecated - 'format' argument, as supported in v1.2
	    var i = buf && offset || 0;

	    if (typeof(options) === 'string') {
	      buf = (options === 'binary') ? new BufferClass(16) : null;
	      options = null;
	    }
	    options = options || {};

	    var rnds = options.random || (options.rng || _rng)();

	    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
	    rnds[6] = (rnds[6] & 0x0f) | 0x40;
	    rnds[8] = (rnds[8] & 0x3f) | 0x80;

	    // Copy bytes to buffer, if provided
	    if (buf) {
	      for (var ii = 0; ii < 16; ii++) {
	        buf[i + ii] = rnds[ii];
	      }
	    }

	    return buf || unparse(rnds);
	  }

	  // Export public API
	  var uuid = v4;
	  uuid.v1 = v1;
	  uuid.v4 = v4;
	  uuid.parse = parse;
	  uuid.unparse = unparse;
	  uuid.BufferClass = BufferClass;
	  uuid._rng = _rng;
	  uuid._mathRNG = _mathRNG;
	  uuid._nodeRNG = _nodeRNG;
	  uuid._whatwgRNG = _whatwgRNG;

	  if (('undefined' !== typeof module) && module.exports) {
	    // Publish as node.js module
	    module.exports = uuid;
	  } else if (true) {
	    // Publish as AMD module
	    !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {return uuid;}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


	  } else {
	    // Publish as global (in browsers)
	    _previousRoot = _window.uuid;

	    // **`noConflict()` - (browser only) to reset global 'uuid' var**
	    uuid.noConflict = function() {
	      _window.uuid = _previousRoot;
	      return uuid;
	    };

	    _window.uuid = uuid;
	  }
	})('undefined' !== typeof window ? window : null);

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer, global) {/*!
	 * The buffer module from node.js, for the browser.
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */
	/* eslint-disable no-proto */

	'use strict'

	var base64 = __webpack_require__(62)
	var ieee754 = __webpack_require__(63)
	var isArray = __webpack_require__(64)

	exports.Buffer = Buffer
	exports.SlowBuffer = SlowBuffer
	exports.INSPECT_MAX_BYTES = 50
	Buffer.poolSize = 8192 // not used by this implementation

	var rootParent = {}

	/**
	 * If `Buffer.TYPED_ARRAY_SUPPORT`:
	 *   === true    Use Uint8Array implementation (fastest)
	 *   === false   Use Object implementation (most compatible, even IE6)
	 *
	 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
	 * Opera 11.6+, iOS 4.2+.
	 *
	 * Due to various browser bugs, sometimes the Object implementation will be used even
	 * when the browser supports typed arrays.
	 *
	 * Note:
	 *
	 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
	 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
	 *
	 *   - Safari 5-7 lacks support for changing the `Object.prototype.constructor` property
	 *     on objects.
	 *
	 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
	 *
	 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
	 *     incorrect length in some situations.

	 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
	 * get the Object implementation, which is slower but behaves correctly.
	 */
	Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
	  ? global.TYPED_ARRAY_SUPPORT
	  : typedArraySupport()

	function typedArraySupport () {
	  function Bar () {}
	  try {
	    var arr = new Uint8Array(1)
	    arr.foo = function () { return 42 }
	    arr.constructor = Bar
	    return arr.foo() === 42 && // typed array instances can be augmented
	        arr.constructor === Bar && // constructor can be set
	        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
	        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
	  } catch (e) {
	    return false
	  }
	}

	function kMaxLength () {
	  return Buffer.TYPED_ARRAY_SUPPORT
	    ? 0x7fffffff
	    : 0x3fffffff
	}

	/**
	 * Class: Buffer
	 * =============
	 *
	 * The Buffer constructor returns instances of `Uint8Array` that are augmented
	 * with function properties for all the node `Buffer` API functions. We use
	 * `Uint8Array` so that square bracket notation works as expected -- it returns
	 * a single octet.
	 *
	 * By augmenting the instances, we can avoid modifying the `Uint8Array`
	 * prototype.
	 */
	function Buffer (arg) {
	  if (!(this instanceof Buffer)) {
	    // Avoid going through an ArgumentsAdaptorTrampoline in the common case.
	    if (arguments.length > 1) return new Buffer(arg, arguments[1])
	    return new Buffer(arg)
	  }

	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    this.length = 0
	    this.parent = undefined
	  }

	  // Common case.
	  if (typeof arg === 'number') {
	    return fromNumber(this, arg)
	  }

	  // Slightly less common case.
	  if (typeof arg === 'string') {
	    return fromString(this, arg, arguments.length > 1 ? arguments[1] : 'utf8')
	  }

	  // Unusual.
	  return fromObject(this, arg)
	}

	function fromNumber (that, length) {
	  that = allocate(that, length < 0 ? 0 : checked(length) | 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) {
	    for (var i = 0; i < length; i++) {
	      that[i] = 0
	    }
	  }
	  return that
	}

	function fromString (that, string, encoding) {
	  if (typeof encoding !== 'string' || encoding === '') encoding = 'utf8'

	  // Assumption: byteLength() return value is always < kMaxLength.
	  var length = byteLength(string, encoding) | 0
	  that = allocate(that, length)

	  that.write(string, encoding)
	  return that
	}

	function fromObject (that, object) {
	  if (Buffer.isBuffer(object)) return fromBuffer(that, object)

	  if (isArray(object)) return fromArray(that, object)

	  if (object == null) {
	    throw new TypeError('must start with number, buffer, array or string')
	  }

	  if (typeof ArrayBuffer !== 'undefined') {
	    if (object.buffer instanceof ArrayBuffer) {
	      return fromTypedArray(that, object)
	    }
	    if (object instanceof ArrayBuffer) {
	      return fromArrayBuffer(that, object)
	    }
	  }

	  if (object.length) return fromArrayLike(that, object)

	  return fromJsonObject(that, object)
	}

	function fromBuffer (that, buffer) {
	  var length = checked(buffer.length) | 0
	  that = allocate(that, length)
	  buffer.copy(that, 0, 0, length)
	  return that
	}

	function fromArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Duplicate of fromArray() to keep fromArray() monomorphic.
	function fromTypedArray (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  // Truncating the elements is probably not what people expect from typed
	  // arrays with BYTES_PER_ELEMENT > 1 but it's compatible with the behavior
	  // of the old Buffer constructor.
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	function fromArrayBuffer (that, array) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    array.byteLength
	    that = Buffer._augment(new Uint8Array(array))
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that = fromTypedArray(that, new Uint8Array(array))
	  }
	  return that
	}

	function fromArrayLike (that, array) {
	  var length = checked(array.length) | 0
	  that = allocate(that, length)
	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	// Deserialize { type: 'Buffer', data: [1,2,3,...] } into a Buffer object.
	// Returns a zero-length buffer for inputs that don't conform to the spec.
	function fromJsonObject (that, object) {
	  var array
	  var length = 0

	  if (object.type === 'Buffer' && isArray(object.data)) {
	    array = object.data
	    length = checked(array.length) | 0
	  }
	  that = allocate(that, length)

	  for (var i = 0; i < length; i += 1) {
	    that[i] = array[i] & 255
	  }
	  return that
	}

	if (Buffer.TYPED_ARRAY_SUPPORT) {
	  Buffer.prototype.__proto__ = Uint8Array.prototype
	  Buffer.__proto__ = Uint8Array
	} else {
	  // pre-set for values that may exist in the future
	  Buffer.prototype.length = undefined
	  Buffer.prototype.parent = undefined
	}

	function allocate (that, length) {
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    // Return an augmented `Uint8Array` instance, for best performance
	    that = Buffer._augment(new Uint8Array(length))
	    that.__proto__ = Buffer.prototype
	  } else {
	    // Fallback: Return an object instance of the Buffer class
	    that.length = length
	    that._isBuffer = true
	  }

	  var fromPool = length !== 0 && length <= Buffer.poolSize >>> 1
	  if (fromPool) that.parent = rootParent

	  return that
	}

	function checked (length) {
	  // Note: cannot use `length < kMaxLength` here because that fails when
	  // length is NaN (which is otherwise coerced to zero.)
	  if (length >= kMaxLength()) {
	    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
	                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
	  }
	  return length | 0
	}

	function SlowBuffer (subject, encoding) {
	  if (!(this instanceof SlowBuffer)) return new SlowBuffer(subject, encoding)

	  var buf = new Buffer(subject, encoding)
	  delete buf.parent
	  return buf
	}

	Buffer.isBuffer = function isBuffer (b) {
	  return !!(b != null && b._isBuffer)
	}

	Buffer.compare = function compare (a, b) {
	  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
	    throw new TypeError('Arguments must be Buffers')
	  }

	  if (a === b) return 0

	  var x = a.length
	  var y = b.length

	  var i = 0
	  var len = Math.min(x, y)
	  while (i < len) {
	    if (a[i] !== b[i]) break

	    ++i
	  }

	  if (i !== len) {
	    x = a[i]
	    y = b[i]
	  }

	  if (x < y) return -1
	  if (y < x) return 1
	  return 0
	}

	Buffer.isEncoding = function isEncoding (encoding) {
	  switch (String(encoding).toLowerCase()) {
	    case 'hex':
	    case 'utf8':
	    case 'utf-8':
	    case 'ascii':
	    case 'binary':
	    case 'base64':
	    case 'raw':
	    case 'ucs2':
	    case 'ucs-2':
	    case 'utf16le':
	    case 'utf-16le':
	      return true
	    default:
	      return false
	  }
	}

	Buffer.concat = function concat (list, length) {
	  if (!isArray(list)) throw new TypeError('list argument must be an Array of Buffers.')

	  if (list.length === 0) {
	    return new Buffer(0)
	  }

	  var i
	  if (length === undefined) {
	    length = 0
	    for (i = 0; i < list.length; i++) {
	      length += list[i].length
	    }
	  }

	  var buf = new Buffer(length)
	  var pos = 0
	  for (i = 0; i < list.length; i++) {
	    var item = list[i]
	    item.copy(buf, pos)
	    pos += item.length
	  }
	  return buf
	}

	function byteLength (string, encoding) {
	  if (typeof string !== 'string') string = '' + string

	  var len = string.length
	  if (len === 0) return 0

	  // Use a for loop to avoid recursion
	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'ascii':
	      case 'binary':
	      // Deprecated
	      case 'raw':
	      case 'raws':
	        return len
	      case 'utf8':
	      case 'utf-8':
	        return utf8ToBytes(string).length
	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return len * 2
	      case 'hex':
	        return len >>> 1
	      case 'base64':
	        return base64ToBytes(string).length
	      default:
	        if (loweredCase) return utf8ToBytes(string).length // assume utf8
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}
	Buffer.byteLength = byteLength

	function slowToString (encoding, start, end) {
	  var loweredCase = false

	  start = start | 0
	  end = end === undefined || end === Infinity ? this.length : end | 0

	  if (!encoding) encoding = 'utf8'
	  if (start < 0) start = 0
	  if (end > this.length) end = this.length
	  if (end <= start) return ''

	  while (true) {
	    switch (encoding) {
	      case 'hex':
	        return hexSlice(this, start, end)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Slice(this, start, end)

	      case 'ascii':
	        return asciiSlice(this, start, end)

	      case 'binary':
	        return binarySlice(this, start, end)

	      case 'base64':
	        return base64Slice(this, start, end)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return utf16leSlice(this, start, end)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = (encoding + '').toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toString = function toString () {
	  var length = this.length | 0
	  if (length === 0) return ''
	  if (arguments.length === 0) return utf8Slice(this, 0, length)
	  return slowToString.apply(this, arguments)
	}

	Buffer.prototype.equals = function equals (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return true
	  return Buffer.compare(this, b) === 0
	}

	Buffer.prototype.inspect = function inspect () {
	  var str = ''
	  var max = exports.INSPECT_MAX_BYTES
	  if (this.length > 0) {
	    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
	    if (this.length > max) str += ' ... '
	  }
	  return '<Buffer ' + str + '>'
	}

	Buffer.prototype.compare = function compare (b) {
	  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
	  if (this === b) return 0
	  return Buffer.compare(this, b)
	}

	Buffer.prototype.indexOf = function indexOf (val, byteOffset) {
	  if (byteOffset > 0x7fffffff) byteOffset = 0x7fffffff
	  else if (byteOffset < -0x80000000) byteOffset = -0x80000000
	  byteOffset >>= 0

	  if (this.length === 0) return -1
	  if (byteOffset >= this.length) return -1

	  // Negative offsets start from the end of the buffer
	  if (byteOffset < 0) byteOffset = Math.max(this.length + byteOffset, 0)

	  if (typeof val === 'string') {
	    if (val.length === 0) return -1 // special case: looking for empty string always fails
	    return String.prototype.indexOf.call(this, val, byteOffset)
	  }
	  if (Buffer.isBuffer(val)) {
	    return arrayIndexOf(this, val, byteOffset)
	  }
	  if (typeof val === 'number') {
	    if (Buffer.TYPED_ARRAY_SUPPORT && Uint8Array.prototype.indexOf === 'function') {
	      return Uint8Array.prototype.indexOf.call(this, val, byteOffset)
	    }
	    return arrayIndexOf(this, [ val ], byteOffset)
	  }

	  function arrayIndexOf (arr, val, byteOffset) {
	    var foundIndex = -1
	    for (var i = 0; byteOffset + i < arr.length; i++) {
	      if (arr[byteOffset + i] === val[foundIndex === -1 ? 0 : i - foundIndex]) {
	        if (foundIndex === -1) foundIndex = i
	        if (i - foundIndex + 1 === val.length) return byteOffset + foundIndex
	      } else {
	        foundIndex = -1
	      }
	    }
	    return -1
	  }

	  throw new TypeError('val must be string, number or Buffer')
	}

	// `get` is deprecated
	Buffer.prototype.get = function get (offset) {
	  console.log('.get() is deprecated. Access using array indexes instead.')
	  return this.readUInt8(offset)
	}

	// `set` is deprecated
	Buffer.prototype.set = function set (v, offset) {
	  console.log('.set() is deprecated. Access using array indexes instead.')
	  return this.writeUInt8(v, offset)
	}

	function hexWrite (buf, string, offset, length) {
	  offset = Number(offset) || 0
	  var remaining = buf.length - offset
	  if (!length) {
	    length = remaining
	  } else {
	    length = Number(length)
	    if (length > remaining) {
	      length = remaining
	    }
	  }

	  // must be an even number of digits
	  var strLen = string.length
	  if (strLen % 2 !== 0) throw new Error('Invalid hex string')

	  if (length > strLen / 2) {
	    length = strLen / 2
	  }
	  for (var i = 0; i < length; i++) {
	    var parsed = parseInt(string.substr(i * 2, 2), 16)
	    if (isNaN(parsed)) throw new Error('Invalid hex string')
	    buf[offset + i] = parsed
	  }
	  return i
	}

	function utf8Write (buf, string, offset, length) {
	  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
	}

	function asciiWrite (buf, string, offset, length) {
	  return blitBuffer(asciiToBytes(string), buf, offset, length)
	}

	function binaryWrite (buf, string, offset, length) {
	  return asciiWrite(buf, string, offset, length)
	}

	function base64Write (buf, string, offset, length) {
	  return blitBuffer(base64ToBytes(string), buf, offset, length)
	}

	function ucs2Write (buf, string, offset, length) {
	  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
	}

	Buffer.prototype.write = function write (string, offset, length, encoding) {
	  // Buffer#write(string)
	  if (offset === undefined) {
	    encoding = 'utf8'
	    length = this.length
	    offset = 0
	  // Buffer#write(string, encoding)
	  } else if (length === undefined && typeof offset === 'string') {
	    encoding = offset
	    length = this.length
	    offset = 0
	  // Buffer#write(string, offset[, length][, encoding])
	  } else if (isFinite(offset)) {
	    offset = offset | 0
	    if (isFinite(length)) {
	      length = length | 0
	      if (encoding === undefined) encoding = 'utf8'
	    } else {
	      encoding = length
	      length = undefined
	    }
	  // legacy write(string, encoding, offset, length) - remove in v0.13
	  } else {
	    var swap = encoding
	    encoding = offset
	    offset = length | 0
	    length = swap
	  }

	  var remaining = this.length - offset
	  if (length === undefined || length > remaining) length = remaining

	  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
	    throw new RangeError('attempt to write outside buffer bounds')
	  }

	  if (!encoding) encoding = 'utf8'

	  var loweredCase = false
	  for (;;) {
	    switch (encoding) {
	      case 'hex':
	        return hexWrite(this, string, offset, length)

	      case 'utf8':
	      case 'utf-8':
	        return utf8Write(this, string, offset, length)

	      case 'ascii':
	        return asciiWrite(this, string, offset, length)

	      case 'binary':
	        return binaryWrite(this, string, offset, length)

	      case 'base64':
	        // Warning: maxLength not taken into account in base64Write
	        return base64Write(this, string, offset, length)

	      case 'ucs2':
	      case 'ucs-2':
	      case 'utf16le':
	      case 'utf-16le':
	        return ucs2Write(this, string, offset, length)

	      default:
	        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
	        encoding = ('' + encoding).toLowerCase()
	        loweredCase = true
	    }
	  }
	}

	Buffer.prototype.toJSON = function toJSON () {
	  return {
	    type: 'Buffer',
	    data: Array.prototype.slice.call(this._arr || this, 0)
	  }
	}

	function base64Slice (buf, start, end) {
	  if (start === 0 && end === buf.length) {
	    return base64.fromByteArray(buf)
	  } else {
	    return base64.fromByteArray(buf.slice(start, end))
	  }
	}

	function utf8Slice (buf, start, end) {
	  end = Math.min(buf.length, end)
	  var res = []

	  var i = start
	  while (i < end) {
	    var firstByte = buf[i]
	    var codePoint = null
	    var bytesPerSequence = (firstByte > 0xEF) ? 4
	      : (firstByte > 0xDF) ? 3
	      : (firstByte > 0xBF) ? 2
	      : 1

	    if (i + bytesPerSequence <= end) {
	      var secondByte, thirdByte, fourthByte, tempCodePoint

	      switch (bytesPerSequence) {
	        case 1:
	          if (firstByte < 0x80) {
	            codePoint = firstByte
	          }
	          break
	        case 2:
	          secondByte = buf[i + 1]
	          if ((secondByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
	            if (tempCodePoint > 0x7F) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 3:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
	            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
	              codePoint = tempCodePoint
	            }
	          }
	          break
	        case 4:
	          secondByte = buf[i + 1]
	          thirdByte = buf[i + 2]
	          fourthByte = buf[i + 3]
	          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
	            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
	            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
	              codePoint = tempCodePoint
	            }
	          }
	      }
	    }

	    if (codePoint === null) {
	      // we did not generate a valid codePoint so insert a
	      // replacement char (U+FFFD) and advance only 1 byte
	      codePoint = 0xFFFD
	      bytesPerSequence = 1
	    } else if (codePoint > 0xFFFF) {
	      // encode to utf16 (surrogate pair dance)
	      codePoint -= 0x10000
	      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
	      codePoint = 0xDC00 | codePoint & 0x3FF
	    }

	    res.push(codePoint)
	    i += bytesPerSequence
	  }

	  return decodeCodePointsArray(res)
	}

	// Based on http://stackoverflow.com/a/22747272/680742, the browser with
	// the lowest limit is Chrome, with 0x10000 args.
	// We go 1 magnitude less, for safety
	var MAX_ARGUMENTS_LENGTH = 0x1000

	function decodeCodePointsArray (codePoints) {
	  var len = codePoints.length
	  if (len <= MAX_ARGUMENTS_LENGTH) {
	    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
	  }

	  // Decode in chunks to avoid "call stack size exceeded".
	  var res = ''
	  var i = 0
	  while (i < len) {
	    res += String.fromCharCode.apply(
	      String,
	      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
	    )
	  }
	  return res
	}

	function asciiSlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i] & 0x7F)
	  }
	  return ret
	}

	function binarySlice (buf, start, end) {
	  var ret = ''
	  end = Math.min(buf.length, end)

	  for (var i = start; i < end; i++) {
	    ret += String.fromCharCode(buf[i])
	  }
	  return ret
	}

	function hexSlice (buf, start, end) {
	  var len = buf.length

	  if (!start || start < 0) start = 0
	  if (!end || end < 0 || end > len) end = len

	  var out = ''
	  for (var i = start; i < end; i++) {
	    out += toHex(buf[i])
	  }
	  return out
	}

	function utf16leSlice (buf, start, end) {
	  var bytes = buf.slice(start, end)
	  var res = ''
	  for (var i = 0; i < bytes.length; i += 2) {
	    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
	  }
	  return res
	}

	Buffer.prototype.slice = function slice (start, end) {
	  var len = this.length
	  start = ~~start
	  end = end === undefined ? len : ~~end

	  if (start < 0) {
	    start += len
	    if (start < 0) start = 0
	  } else if (start > len) {
	    start = len
	  }

	  if (end < 0) {
	    end += len
	    if (end < 0) end = 0
	  } else if (end > len) {
	    end = len
	  }

	  if (end < start) end = start

	  var newBuf
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    newBuf = Buffer._augment(this.subarray(start, end))
	  } else {
	    var sliceLen = end - start
	    newBuf = new Buffer(sliceLen, undefined)
	    for (var i = 0; i < sliceLen; i++) {
	      newBuf[i] = this[i + start]
	    }
	  }

	  if (newBuf.length) newBuf.parent = this.parent || this

	  return newBuf
	}

	/*
	 * Need to make sure that buffer isn't trying to write out of bounds.
	 */
	function checkOffset (offset, ext, length) {
	  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
	  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
	}

	Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }

	  return val
	}

	Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) {
	    checkOffset(offset, byteLength, this.length)
	  }

	  var val = this[offset + --byteLength]
	  var mul = 1
	  while (byteLength > 0 && (mul *= 0x100)) {
	    val += this[offset + --byteLength] * mul
	  }

	  return val
	}

	Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  return this[offset]
	}

	Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return this[offset] | (this[offset + 1] << 8)
	}

	Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  return (this[offset] << 8) | this[offset + 1]
	}

	Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return ((this[offset]) |
	      (this[offset + 1] << 8) |
	      (this[offset + 2] << 16)) +
	      (this[offset + 3] * 0x1000000)
	}

	Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] * 0x1000000) +
	    ((this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    this[offset + 3])
	}

	Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var val = this[offset]
	  var mul = 1
	  var i = 0
	  while (++i < byteLength && (mul *= 0x100)) {
	    val += this[offset + i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkOffset(offset, byteLength, this.length)

	  var i = byteLength
	  var mul = 1
	  var val = this[offset + --i]
	  while (i > 0 && (mul *= 0x100)) {
	    val += this[offset + --i] * mul
	  }
	  mul *= 0x80

	  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

	  return val
	}

	Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 1, this.length)
	  if (!(this[offset] & 0x80)) return (this[offset])
	  return ((0xff - this[offset] + 1) * -1)
	}

	Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset] | (this[offset + 1] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 2, this.length)
	  var val = this[offset + 1] | (this[offset] << 8)
	  return (val & 0x8000) ? val | 0xFFFF0000 : val
	}

	Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset]) |
	    (this[offset + 1] << 8) |
	    (this[offset + 2] << 16) |
	    (this[offset + 3] << 24)
	}

	Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)

	  return (this[offset] << 24) |
	    (this[offset + 1] << 16) |
	    (this[offset + 2] << 8) |
	    (this[offset + 3])
	}

	Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, true, 23, 4)
	}

	Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 4, this.length)
	  return ieee754.read(this, offset, false, 23, 4)
	}

	Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, true, 52, 8)
	}

	Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
	  if (!noAssert) checkOffset(offset, 8, this.length)
	  return ieee754.read(this, offset, false, 52, 8)
	}

	function checkInt (buf, value, offset, ext, max, min) {
	  if (!Buffer.isBuffer(buf)) throw new TypeError('buffer must be a Buffer instance')
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	}

	Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var mul = 1
	  var i = 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  byteLength = byteLength | 0
	  if (!noAssert) checkInt(this, value, offset, byteLength, Math.pow(2, 8 * byteLength), 0)

	  var i = byteLength - 1
	  var mul = 1
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = (value / mul) & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	function objectWriteUInt16 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; i++) {
	    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
	      (littleEndian ? i : 1 - i) * 8
	  }
	}

	Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	function objectWriteUInt32 (buf, value, offset, littleEndian) {
	  if (value < 0) value = 0xffffffff + value + 1
	  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; i++) {
	    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
	  }
	}

	Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset + 3] = (value >>> 24)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 1] = (value >>> 8)
	    this[offset] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = 0
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset] = value & 0xFF
	  while (++i < byteLength && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) {
	    var limit = Math.pow(2, 8 * byteLength - 1)

	    checkInt(this, value, offset, byteLength, limit - 1, -limit)
	  }

	  var i = byteLength - 1
	  var mul = 1
	  var sub = value < 0 ? 1 : 0
	  this[offset + i] = value & 0xFF
	  while (--i >= 0 && (mul *= 0x100)) {
	    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
	  }

	  return offset + byteLength
	}

	Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
	  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
	  if (value < 0) value = 0xff + value + 1
	  this[offset] = (value & 0xff)
	  return offset + 1
	}

	Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	  } else {
	    objectWriteUInt16(this, value, offset, true)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 8)
	    this[offset + 1] = (value & 0xff)
	  } else {
	    objectWriteUInt16(this, value, offset, false)
	  }
	  return offset + 2
	}

	Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value & 0xff)
	    this[offset + 1] = (value >>> 8)
	    this[offset + 2] = (value >>> 16)
	    this[offset + 3] = (value >>> 24)
	  } else {
	    objectWriteUInt32(this, value, offset, true)
	  }
	  return offset + 4
	}

	Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
	  value = +value
	  offset = offset | 0
	  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
	  if (value < 0) value = 0xffffffff + value + 1
	  if (Buffer.TYPED_ARRAY_SUPPORT) {
	    this[offset] = (value >>> 24)
	    this[offset + 1] = (value >>> 16)
	    this[offset + 2] = (value >>> 8)
	    this[offset + 3] = (value & 0xff)
	  } else {
	    objectWriteUInt32(this, value, offset, false)
	  }
	  return offset + 4
	}

	function checkIEEE754 (buf, value, offset, ext, max, min) {
	  if (value > max || value < min) throw new RangeError('value is out of bounds')
	  if (offset + ext > buf.length) throw new RangeError('index out of range')
	  if (offset < 0) throw new RangeError('index out of range')
	}

	function writeFloat (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 23, 4)
	  return offset + 4
	}

	Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
	  return writeFloat(this, value, offset, false, noAssert)
	}

	function writeDouble (buf, value, offset, littleEndian, noAssert) {
	  if (!noAssert) {
	    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
	  }
	  ieee754.write(buf, value, offset, littleEndian, 52, 8)
	  return offset + 8
	}

	Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, true, noAssert)
	}

	Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
	  return writeDouble(this, value, offset, false, noAssert)
	}

	// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
	Buffer.prototype.copy = function copy (target, targetStart, start, end) {
	  if (!start) start = 0
	  if (!end && end !== 0) end = this.length
	  if (targetStart >= target.length) targetStart = target.length
	  if (!targetStart) targetStart = 0
	  if (end > 0 && end < start) end = start

	  // Copy 0 bytes; we're done
	  if (end === start) return 0
	  if (target.length === 0 || this.length === 0) return 0

	  // Fatal error conditions
	  if (targetStart < 0) {
	    throw new RangeError('targetStart out of bounds')
	  }
	  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
	  if (end < 0) throw new RangeError('sourceEnd out of bounds')

	  // Are we oob?
	  if (end > this.length) end = this.length
	  if (target.length - targetStart < end - start) {
	    end = target.length - targetStart + start
	  }

	  var len = end - start
	  var i

	  if (this === target && start < targetStart && targetStart < end) {
	    // descending copy from end
	    for (i = len - 1; i >= 0; i--) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
	    // ascending copy from start
	    for (i = 0; i < len; i++) {
	      target[i + targetStart] = this[i + start]
	    }
	  } else {
	    target._set(this.subarray(start, start + len), targetStart)
	  }

	  return len
	}

	// fill(value, start=0, end=buffer.length)
	Buffer.prototype.fill = function fill (value, start, end) {
	  if (!value) value = 0
	  if (!start) start = 0
	  if (!end) end = this.length

	  if (end < start) throw new RangeError('end < start')

	  // Fill 0 bytes; we're done
	  if (end === start) return
	  if (this.length === 0) return

	  if (start < 0 || start >= this.length) throw new RangeError('start out of bounds')
	  if (end < 0 || end > this.length) throw new RangeError('end out of bounds')

	  var i
	  if (typeof value === 'number') {
	    for (i = start; i < end; i++) {
	      this[i] = value
	    }
	  } else {
	    var bytes = utf8ToBytes(value.toString())
	    var len = bytes.length
	    for (i = start; i < end; i++) {
	      this[i] = bytes[i % len]
	    }
	  }

	  return this
	}

	/**
	 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
	 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
	 */
	Buffer.prototype.toArrayBuffer = function toArrayBuffer () {
	  if (typeof Uint8Array !== 'undefined') {
	    if (Buffer.TYPED_ARRAY_SUPPORT) {
	      return (new Buffer(this)).buffer
	    } else {
	      var buf = new Uint8Array(this.length)
	      for (var i = 0, len = buf.length; i < len; i += 1) {
	        buf[i] = this[i]
	      }
	      return buf.buffer
	    }
	  } else {
	    throw new TypeError('Buffer.toArrayBuffer not supported in this browser')
	  }
	}

	// HELPER FUNCTIONS
	// ================

	var BP = Buffer.prototype

	/**
	 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
	 */
	Buffer._augment = function _augment (arr) {
	  arr.constructor = Buffer
	  arr._isBuffer = true

	  // save reference to original Uint8Array set method before overwriting
	  arr._set = arr.set

	  // deprecated
	  arr.get = BP.get
	  arr.set = BP.set

	  arr.write = BP.write
	  arr.toString = BP.toString
	  arr.toLocaleString = BP.toString
	  arr.toJSON = BP.toJSON
	  arr.equals = BP.equals
	  arr.compare = BP.compare
	  arr.indexOf = BP.indexOf
	  arr.copy = BP.copy
	  arr.slice = BP.slice
	  arr.readUIntLE = BP.readUIntLE
	  arr.readUIntBE = BP.readUIntBE
	  arr.readUInt8 = BP.readUInt8
	  arr.readUInt16LE = BP.readUInt16LE
	  arr.readUInt16BE = BP.readUInt16BE
	  arr.readUInt32LE = BP.readUInt32LE
	  arr.readUInt32BE = BP.readUInt32BE
	  arr.readIntLE = BP.readIntLE
	  arr.readIntBE = BP.readIntBE
	  arr.readInt8 = BP.readInt8
	  arr.readInt16LE = BP.readInt16LE
	  arr.readInt16BE = BP.readInt16BE
	  arr.readInt32LE = BP.readInt32LE
	  arr.readInt32BE = BP.readInt32BE
	  arr.readFloatLE = BP.readFloatLE
	  arr.readFloatBE = BP.readFloatBE
	  arr.readDoubleLE = BP.readDoubleLE
	  arr.readDoubleBE = BP.readDoubleBE
	  arr.writeUInt8 = BP.writeUInt8
	  arr.writeUIntLE = BP.writeUIntLE
	  arr.writeUIntBE = BP.writeUIntBE
	  arr.writeUInt16LE = BP.writeUInt16LE
	  arr.writeUInt16BE = BP.writeUInt16BE
	  arr.writeUInt32LE = BP.writeUInt32LE
	  arr.writeUInt32BE = BP.writeUInt32BE
	  arr.writeIntLE = BP.writeIntLE
	  arr.writeIntBE = BP.writeIntBE
	  arr.writeInt8 = BP.writeInt8
	  arr.writeInt16LE = BP.writeInt16LE
	  arr.writeInt16BE = BP.writeInt16BE
	  arr.writeInt32LE = BP.writeInt32LE
	  arr.writeInt32BE = BP.writeInt32BE
	  arr.writeFloatLE = BP.writeFloatLE
	  arr.writeFloatBE = BP.writeFloatBE
	  arr.writeDoubleLE = BP.writeDoubleLE
	  arr.writeDoubleBE = BP.writeDoubleBE
	  arr.fill = BP.fill
	  arr.inspect = BP.inspect
	  arr.toArrayBuffer = BP.toArrayBuffer

	  return arr
	}

	var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

	function base64clean (str) {
	  // Node strips out invalid characters like \n and \t from the string, base64-js does not
	  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
	  // Node converts strings with length < 2 to ''
	  if (str.length < 2) return ''
	  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
	  while (str.length % 4 !== 0) {
	    str = str + '='
	  }
	  return str
	}

	function stringtrim (str) {
	  if (str.trim) return str.trim()
	  return str.replace(/^\s+|\s+$/g, '')
	}

	function toHex (n) {
	  if (n < 16) return '0' + n.toString(16)
	  return n.toString(16)
	}

	function utf8ToBytes (string, units) {
	  units = units || Infinity
	  var codePoint
	  var length = string.length
	  var leadSurrogate = null
	  var bytes = []

	  for (var i = 0; i < length; i++) {
	    codePoint = string.charCodeAt(i)

	    // is surrogate component
	    if (codePoint > 0xD7FF && codePoint < 0xE000) {
	      // last char was a lead
	      if (!leadSurrogate) {
	        // no lead yet
	        if (codePoint > 0xDBFF) {
	          // unexpected trail
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        } else if (i + 1 === length) {
	          // unpaired lead
	          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	          continue
	        }

	        // valid lead
	        leadSurrogate = codePoint

	        continue
	      }

	      // 2 leads in a row
	      if (codePoint < 0xDC00) {
	        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	        leadSurrogate = codePoint
	        continue
	      }

	      // valid surrogate pair
	      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
	    } else if (leadSurrogate) {
	      // valid bmp char, but last char was a lead
	      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
	    }

	    leadSurrogate = null

	    // encode utf8
	    if (codePoint < 0x80) {
	      if ((units -= 1) < 0) break
	      bytes.push(codePoint)
	    } else if (codePoint < 0x800) {
	      if ((units -= 2) < 0) break
	      bytes.push(
	        codePoint >> 0x6 | 0xC0,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x10000) {
	      if ((units -= 3) < 0) break
	      bytes.push(
	        codePoint >> 0xC | 0xE0,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else if (codePoint < 0x110000) {
	      if ((units -= 4) < 0) break
	      bytes.push(
	        codePoint >> 0x12 | 0xF0,
	        codePoint >> 0xC & 0x3F | 0x80,
	        codePoint >> 0x6 & 0x3F | 0x80,
	        codePoint & 0x3F | 0x80
	      )
	    } else {
	      throw new Error('Invalid code point')
	    }
	  }

	  return bytes
	}

	function asciiToBytes (str) {
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    // Node's code seems to be doing this and not & 0x7F..
	    byteArray.push(str.charCodeAt(i) & 0xFF)
	  }
	  return byteArray
	}

	function utf16leToBytes (str, units) {
	  var c, hi, lo
	  var byteArray = []
	  for (var i = 0; i < str.length; i++) {
	    if ((units -= 2) < 0) break

	    c = str.charCodeAt(i)
	    hi = c >> 8
	    lo = c % 256
	    byteArray.push(lo)
	    byteArray.push(hi)
	  }

	  return byteArray
	}

	function base64ToBytes (str) {
	  return base64.toByteArray(base64clean(str))
	}

	function blitBuffer (src, dst, offset, length) {
	  for (var i = 0; i < length; i++) {
	    if ((i + offset >= dst.length) || (i >= src.length)) break
	    dst[i + offset] = src[i]
	  }
	  return i
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer, (function() { return this; }())))

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

	var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	;(function (exports) {
		'use strict';

	  var Arr = (typeof Uint8Array !== 'undefined')
	    ? Uint8Array
	    : Array

		var PLUS   = '+'.charCodeAt(0)
		var SLASH  = '/'.charCodeAt(0)
		var NUMBER = '0'.charCodeAt(0)
		var LOWER  = 'a'.charCodeAt(0)
		var UPPER  = 'A'.charCodeAt(0)
		var PLUS_URL_SAFE = '-'.charCodeAt(0)
		var SLASH_URL_SAFE = '_'.charCodeAt(0)

		function decode (elt) {
			var code = elt.charCodeAt(0)
			if (code === PLUS ||
			    code === PLUS_URL_SAFE)
				return 62 // '+'
			if (code === SLASH ||
			    code === SLASH_URL_SAFE)
				return 63 // '/'
			if (code < NUMBER)
				return -1 //no match
			if (code < NUMBER + 10)
				return code - NUMBER + 26 + 26
			if (code < UPPER + 26)
				return code - UPPER
			if (code < LOWER + 26)
				return code - LOWER + 26
		}

		function b64ToByteArray (b64) {
			var i, j, l, tmp, placeHolders, arr

			if (b64.length % 4 > 0) {
				throw new Error('Invalid string. Length must be a multiple of 4')
			}

			// the number of equal signs (place holders)
			// if there are two placeholders, than the two characters before it
			// represent one byte
			// if there is only one, then the three characters before it represent 2 bytes
			// this is just a cheap hack to not do indexOf twice
			var len = b64.length
			placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

			// base64 is 4/3 + up to two characters of the original data
			arr = new Arr(b64.length * 3 / 4 - placeHolders)

			// if there are placeholders, only get up to the last complete 4 chars
			l = placeHolders > 0 ? b64.length - 4 : b64.length

			var L = 0

			function push (v) {
				arr[L++] = v
			}

			for (i = 0, j = 0; i < l; i += 4, j += 3) {
				tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
				push((tmp & 0xFF0000) >> 16)
				push((tmp & 0xFF00) >> 8)
				push(tmp & 0xFF)
			}

			if (placeHolders === 2) {
				tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
				push(tmp & 0xFF)
			} else if (placeHolders === 1) {
				tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
				push((tmp >> 8) & 0xFF)
				push(tmp & 0xFF)
			}

			return arr
		}

		function uint8ToBase64 (uint8) {
			var i,
				extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
				output = "",
				temp, length

			function encode (num) {
				return lookup.charAt(num)
			}

			function tripletToBase64 (num) {
				return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
			}

			// go through the array every three bytes, we'll deal with trailing stuff later
			for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
				temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
				output += tripletToBase64(temp)
			}

			// pad the end with zeros, but make sure to not forget the extra bytes
			switch (extraBytes) {
				case 1:
					temp = uint8[uint8.length - 1]
					output += encode(temp >> 2)
					output += encode((temp << 4) & 0x3F)
					output += '=='
					break
				case 2:
					temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
					output += encode(temp >> 10)
					output += encode((temp >> 4) & 0x3F)
					output += encode((temp << 2) & 0x3F)
					output += '='
					break
			}

			return output
		}

		exports.toByteArray = b64ToByteArray
		exports.fromByteArray = uint8ToBase64
	}( false ? (this.base64js = {}) : exports))


/***/ },
/* 63 */
/***/ function(module, exports) {

	exports.read = function (buffer, offset, isLE, mLen, nBytes) {
	  var e, m
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var nBits = -7
	  var i = isLE ? (nBytes - 1) : 0
	  var d = isLE ? -1 : 1
	  var s = buffer[offset + i]

	  i += d

	  e = s & ((1 << (-nBits)) - 1)
	  s >>= (-nBits)
	  nBits += eLen
	  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  m = e & ((1 << (-nBits)) - 1)
	  e >>= (-nBits)
	  nBits += mLen
	  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

	  if (e === 0) {
	    e = 1 - eBias
	  } else if (e === eMax) {
	    return m ? NaN : ((s ? -1 : 1) * Infinity)
	  } else {
	    m = m + Math.pow(2, mLen)
	    e = e - eBias
	  }
	  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
	}

	exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
	  var e, m, c
	  var eLen = nBytes * 8 - mLen - 1
	  var eMax = (1 << eLen) - 1
	  var eBias = eMax >> 1
	  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
	  var i = isLE ? 0 : (nBytes - 1)
	  var d = isLE ? 1 : -1
	  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

	  value = Math.abs(value)

	  if (isNaN(value) || value === Infinity) {
	    m = isNaN(value) ? 1 : 0
	    e = eMax
	  } else {
	    e = Math.floor(Math.log(value) / Math.LN2)
	    if (value * (c = Math.pow(2, -e)) < 1) {
	      e--
	      c *= 2
	    }
	    if (e + eBias >= 1) {
	      value += rt / c
	    } else {
	      value += rt * Math.pow(2, 1 - eBias)
	    }
	    if (value * c >= 2) {
	      e++
	      c /= 2
	    }

	    if (e + eBias >= eMax) {
	      m = 0
	      e = eMax
	    } else if (e + eBias >= 1) {
	      m = (value * c - 1) * Math.pow(2, mLen)
	      e = e + eBias
	    } else {
	      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
	      e = 0
	    }
	  }

	  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

	  e = (e << mLen) | m
	  eLen += mLen
	  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

	  buffer[offset + i - d] |= s * 128
	}


/***/ },
/* 64 */
/***/ function(module, exports) {

	var toString = {}.toString;

	module.exports = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};


/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var rng = __webpack_require__(66)

	function error () {
	  var m = [].slice.call(arguments).join(' ')
	  throw new Error([
	    m,
	    'we accept pull requests',
	    'http://github.com/dominictarr/crypto-browserify'
	    ].join('\n'))
	}

	exports.createHash = __webpack_require__(68)

	exports.createHmac = __webpack_require__(81)

	exports.randomBytes = function(size, callback) {
	  if (callback && callback.call) {
	    try {
	      callback.call(this, undefined, new Buffer(rng(size)))
	    } catch (err) { callback(err) }
	  } else {
	    return new Buffer(rng(size))
	  }
	}

	function each(a, f) {
	  for(var i in a)
	    f(a[i], i)
	}

	exports.getHashes = function () {
	  return ['sha1', 'sha256', 'sha512', 'md5', 'rmd160']
	}

	var p = __webpack_require__(82)(exports)
	exports.pbkdf2 = p.pbkdf2
	exports.pbkdf2Sync = p.pbkdf2Sync


	// the least I can do is make error messages for the rest of the node.js/crypto api.
	each(['createCredentials'
	, 'createCipher'
	, 'createCipheriv'
	, 'createDecipher'
	, 'createDecipheriv'
	, 'createSign'
	, 'createVerify'
	, 'createDiffieHellman'
	], function (name) {
	  exports[name] = function () {
	    error('sorry,', name, 'is not implemented yet')
	  }
	})

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, Buffer) {(function() {
	  var g = ('undefined' === typeof window ? global : window) || {}
	  _crypto = (
	    g.crypto || g.msCrypto || __webpack_require__(67)
	  )
	  module.exports = function(size) {
	    // Modern Browsers
	    if(_crypto.getRandomValues) {
	      var bytes = new Buffer(size); //in browserify, this is an extended Uint8Array
	      /* This will not work in older browsers.
	       * See https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
	       */
	    
	      _crypto.getRandomValues(bytes);
	      return bytes;
	    }
	    else if (_crypto.randomBytes) {
	      return _crypto.randomBytes(size)
	    }
	    else
	      throw new Error(
	        'secure random number generation not supported by this browser\n'+
	        'use chrome, FireFox or Internet Explorer 11'
	      )
	  }
	}())

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(61).Buffer))

/***/ },
/* 67 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(69)

	var md5 = toConstructor(__webpack_require__(78))
	var rmd160 = toConstructor(__webpack_require__(80))

	function toConstructor (fn) {
	  return function () {
	    var buffers = []
	    var m= {
	      update: function (data, enc) {
	        if(!Buffer.isBuffer(data)) data = new Buffer(data, enc)
	        buffers.push(data)
	        return this
	      },
	      digest: function (enc) {
	        var buf = Buffer.concat(buffers)
	        var r = fn(buf)
	        buffers = null
	        return enc ? r.toString(enc) : r
	      }
	    }
	    return m
	  }
	}

	module.exports = function (alg) {
	  if('md5' === alg) return new md5()
	  if('rmd160' === alg) return new rmd160()
	  return createHash(alg)
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

	var exports = module.exports = function (alg) {
	  var Alg = exports[alg]
	  if(!Alg) throw new Error(alg + ' is not supported (we accept pull requests)')
	  return new Alg()
	}

	var Buffer = __webpack_require__(61).Buffer
	var Hash   = __webpack_require__(70)(Buffer)

	exports.sha1 = __webpack_require__(71)(Buffer, Hash)
	exports.sha256 = __webpack_require__(76)(Buffer, Hash)
	exports.sha512 = __webpack_require__(77)(Buffer, Hash)


/***/ },
/* 70 */
/***/ function(module, exports) {

	module.exports = function (Buffer) {

	  //prototype class for hash functions
	  function Hash (blockSize, finalSize) {
	    this._block = new Buffer(blockSize) //new Uint32Array(blockSize/4)
	    this._finalSize = finalSize
	    this._blockSize = blockSize
	    this._len = 0
	    this._s = 0
	  }

	  Hash.prototype.init = function () {
	    this._s = 0
	    this._len = 0
	  }

	  Hash.prototype.update = function (data, enc) {
	    if ("string" === typeof data) {
	      enc = enc || "utf8"
	      data = new Buffer(data, enc)
	    }

	    var l = this._len += data.length
	    var s = this._s = (this._s || 0)
	    var f = 0
	    var buffer = this._block

	    while (s < l) {
	      var t = Math.min(data.length, f + this._blockSize - (s % this._blockSize))
	      var ch = (t - f)

	      for (var i = 0; i < ch; i++) {
	        buffer[(s % this._blockSize) + i] = data[i + f]
	      }

	      s += ch
	      f += ch

	      if ((s % this._blockSize) === 0) {
	        this._update(buffer)
	      }
	    }
	    this._s = s

	    return this
	  }

	  Hash.prototype.digest = function (enc) {
	    // Suppose the length of the message M, in bits, is l
	    var l = this._len * 8

	    // Append the bit 1 to the end of the message
	    this._block[this._len % this._blockSize] = 0x80

	    // and then k zero bits, where k is the smallest non-negative solution to the equation (l + 1 + k) === finalSize mod blockSize
	    this._block.fill(0, this._len % this._blockSize + 1)

	    if (l % (this._blockSize * 8) >= this._finalSize * 8) {
	      this._update(this._block)
	      this._block.fill(0)
	    }

	    // to this append the block which is equal to the number l written in binary
	    // TODO: handle case where l is > Math.pow(2, 29)
	    this._block.writeInt32BE(l, this._blockSize - 4)

	    var hash = this._update(this._block) || this._hash()

	    return enc ? hash.toString(enc) : hash
	  }

	  Hash.prototype._update = function () {
	    throw new Error('_update must be implemented by subclass')
	  }

	  return Hash
	}


/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined
	 * in FIPS PUB 180-1
	 * Version 2.1a Copyright Paul Johnston 2000 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for details.
	 */

	var inherits = __webpack_require__(72).inherits

	module.exports = function (Buffer, Hash) {

	  var A = 0|0
	  var B = 4|0
	  var C = 8|0
	  var D = 12|0
	  var E = 16|0

	  var W = new (typeof Int32Array === 'undefined' ? Array : Int32Array)(80)

	  var POOL = []

	  function Sha1 () {
	    if(POOL.length)
	      return POOL.pop().init()

	    if(!(this instanceof Sha1)) return new Sha1()
	    this._w = W
	    Hash.call(this, 16*4, 14*4)

	    this._h = null
	    this.init()
	  }

	  inherits(Sha1, Hash)

	  Sha1.prototype.init = function () {
	    this._a = 0x67452301
	    this._b = 0xefcdab89
	    this._c = 0x98badcfe
	    this._d = 0x10325476
	    this._e = 0xc3d2e1f0

	    Hash.prototype.init.call(this)
	    return this
	  }

	  Sha1.prototype._POOL = POOL
	  Sha1.prototype._update = function (X) {

	    var a, b, c, d, e, _a, _b, _c, _d, _e

	    a = _a = this._a
	    b = _b = this._b
	    c = _c = this._c
	    d = _d = this._d
	    e = _e = this._e

	    var w = this._w

	    for(var j = 0; j < 80; j++) {
	      var W = w[j] = j < 16 ? X.readInt32BE(j*4)
	        : rol(w[j - 3] ^ w[j -  8] ^ w[j - 14] ^ w[j - 16], 1)

	      var t = add(
	        add(rol(a, 5), sha1_ft(j, b, c, d)),
	        add(add(e, W), sha1_kt(j))
	      )

	      e = d
	      d = c
	      c = rol(b, 30)
	      b = a
	      a = t
	    }

	    this._a = add(a, _a)
	    this._b = add(b, _b)
	    this._c = add(c, _c)
	    this._d = add(d, _d)
	    this._e = add(e, _e)
	  }

	  Sha1.prototype._hash = function () {
	    if(POOL.length < 100) POOL.push(this)
	    var H = new Buffer(20)
	    //console.log(this._a|0, this._b|0, this._c|0, this._d|0, this._e|0)
	    H.writeInt32BE(this._a|0, A)
	    H.writeInt32BE(this._b|0, B)
	    H.writeInt32BE(this._c|0, C)
	    H.writeInt32BE(this._d|0, D)
	    H.writeInt32BE(this._e|0, E)
	    return H
	  }

	  /*
	   * Perform the appropriate triplet combination function for the current
	   * iteration
	   */
	  function sha1_ft(t, b, c, d) {
	    if(t < 20) return (b & c) | ((~b) & d);
	    if(t < 40) return b ^ c ^ d;
	    if(t < 60) return (b & c) | (b & d) | (c & d);
	    return b ^ c ^ d;
	  }

	  /*
	   * Determine the appropriate additive constant for the current iteration
	   */
	  function sha1_kt(t) {
	    return (t < 20) ?  1518500249 : (t < 40) ?  1859775393 :
	           (t < 60) ? -1894007588 : -899497514;
	  }

	  /*
	   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	   * to work around bugs in some JS interpreters.
	   * //dominictarr: this is 10 years old, so maybe this can be dropped?)
	   *
	   */
	  function add(x, y) {
	    return (x + y ) | 0
	  //lets see how this goes on testling.
	  //  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  //  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  //  return (msw << 16) | (lsw & 0xFFFF);
	  }

	  /*
	   * Bitwise rotate a 32-bit number to the left.
	   */
	  function rol(num, cnt) {
	    return (num << cnt) | (num >>> (32 - cnt));
	  }

	  return Sha1
	}


/***/ },
/* 72 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global, process) {// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var formatRegExp = /%[sdj%]/g;
	exports.format = function(f) {
	  if (!isString(f)) {
	    var objects = [];
	    for (var i = 0; i < arguments.length; i++) {
	      objects.push(inspect(arguments[i]));
	    }
	    return objects.join(' ');
	  }

	  var i = 1;
	  var args = arguments;
	  var len = args.length;
	  var str = String(f).replace(formatRegExp, function(x) {
	    if (x === '%%') return '%';
	    if (i >= len) return x;
	    switch (x) {
	      case '%s': return String(args[i++]);
	      case '%d': return Number(args[i++]);
	      case '%j':
	        try {
	          return JSON.stringify(args[i++]);
	        } catch (_) {
	          return '[Circular]';
	        }
	      default:
	        return x;
	    }
	  });
	  for (var x = args[i]; i < len; x = args[++i]) {
	    if (isNull(x) || !isObject(x)) {
	      str += ' ' + x;
	    } else {
	      str += ' ' + inspect(x);
	    }
	  }
	  return str;
	};


	// Mark that a method should not be used.
	// Returns a modified function which warns once by default.
	// If --no-deprecation is set, then it is a no-op.
	exports.deprecate = function(fn, msg) {
	  // Allow for deprecating things in the process of starting up.
	  if (isUndefined(global.process)) {
	    return function() {
	      return exports.deprecate(fn, msg).apply(this, arguments);
	    };
	  }

	  if (process.noDeprecation === true) {
	    return fn;
	  }

	  var warned = false;
	  function deprecated() {
	    if (!warned) {
	      if (process.throwDeprecation) {
	        throw new Error(msg);
	      } else if (process.traceDeprecation) {
	        console.trace(msg);
	      } else {
	        console.error(msg);
	      }
	      warned = true;
	    }
	    return fn.apply(this, arguments);
	  }

	  return deprecated;
	};


	var debugs = {};
	var debugEnviron;
	exports.debuglog = function(set) {
	  if (isUndefined(debugEnviron))
	    debugEnviron = process.env.NODE_DEBUG || '';
	  set = set.toUpperCase();
	  if (!debugs[set]) {
	    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
	      var pid = process.pid;
	      debugs[set] = function() {
	        var msg = exports.format.apply(exports, arguments);
	        console.error('%s %d: %s', set, pid, msg);
	      };
	    } else {
	      debugs[set] = function() {};
	    }
	  }
	  return debugs[set];
	};


	/**
	 * Echos the value of a value. Trys to print the value out
	 * in the best way possible given the different types.
	 *
	 * @param {Object} obj The object to print out.
	 * @param {Object} opts Optional options object that alters the output.
	 */
	/* legacy: obj, showHidden, depth, colors*/
	function inspect(obj, opts) {
	  // default options
	  var ctx = {
	    seen: [],
	    stylize: stylizeNoColor
	  };
	  // legacy...
	  if (arguments.length >= 3) ctx.depth = arguments[2];
	  if (arguments.length >= 4) ctx.colors = arguments[3];
	  if (isBoolean(opts)) {
	    // legacy...
	    ctx.showHidden = opts;
	  } else if (opts) {
	    // got an "options" object
	    exports._extend(ctx, opts);
	  }
	  // set default options
	  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
	  if (isUndefined(ctx.depth)) ctx.depth = 2;
	  if (isUndefined(ctx.colors)) ctx.colors = false;
	  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
	  if (ctx.colors) ctx.stylize = stylizeWithColor;
	  return formatValue(ctx, obj, ctx.depth);
	}
	exports.inspect = inspect;


	// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
	inspect.colors = {
	  'bold' : [1, 22],
	  'italic' : [3, 23],
	  'underline' : [4, 24],
	  'inverse' : [7, 27],
	  'white' : [37, 39],
	  'grey' : [90, 39],
	  'black' : [30, 39],
	  'blue' : [34, 39],
	  'cyan' : [36, 39],
	  'green' : [32, 39],
	  'magenta' : [35, 39],
	  'red' : [31, 39],
	  'yellow' : [33, 39]
	};

	// Don't use 'blue' not visible on cmd.exe
	inspect.styles = {
	  'special': 'cyan',
	  'number': 'yellow',
	  'boolean': 'yellow',
	  'undefined': 'grey',
	  'null': 'bold',
	  'string': 'green',
	  'date': 'magenta',
	  // "name": intentionally not styling
	  'regexp': 'red'
	};


	function stylizeWithColor(str, styleType) {
	  var style = inspect.styles[styleType];

	  if (style) {
	    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
	           '\u001b[' + inspect.colors[style][1] + 'm';
	  } else {
	    return str;
	  }
	}


	function stylizeNoColor(str, styleType) {
	  return str;
	}


	function arrayToHash(array) {
	  var hash = {};

	  array.forEach(function(val, idx) {
	    hash[val] = true;
	  });

	  return hash;
	}


	function formatValue(ctx, value, recurseTimes) {
	  // Provide a hook for user-specified inspect functions.
	  // Check that value is an object with an inspect function on it
	  if (ctx.customInspect &&
	      value &&
	      isFunction(value.inspect) &&
	      // Filter out the util module, it's inspect function is special
	      value.inspect !== exports.inspect &&
	      // Also filter out any prototype objects using the circular check.
	      !(value.constructor && value.constructor.prototype === value)) {
	    var ret = value.inspect(recurseTimes, ctx);
	    if (!isString(ret)) {
	      ret = formatValue(ctx, ret, recurseTimes);
	    }
	    return ret;
	  }

	  // Primitive types cannot have properties
	  var primitive = formatPrimitive(ctx, value);
	  if (primitive) {
	    return primitive;
	  }

	  // Look up the keys of the object.
	  var keys = Object.keys(value);
	  var visibleKeys = arrayToHash(keys);

	  if (ctx.showHidden) {
	    keys = Object.getOwnPropertyNames(value);
	  }

	  // IE doesn't make error fields non-enumerable
	  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
	  if (isError(value)
	      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
	    return formatError(value);
	  }

	  // Some type of object without properties can be shortcutted.
	  if (keys.length === 0) {
	    if (isFunction(value)) {
	      var name = value.name ? ': ' + value.name : '';
	      return ctx.stylize('[Function' + name + ']', 'special');
	    }
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    }
	    if (isDate(value)) {
	      return ctx.stylize(Date.prototype.toString.call(value), 'date');
	    }
	    if (isError(value)) {
	      return formatError(value);
	    }
	  }

	  var base = '', array = false, braces = ['{', '}'];

	  // Make Array say that they are Array
	  if (isArray(value)) {
	    array = true;
	    braces = ['[', ']'];
	  }

	  // Make functions say that they are functions
	  if (isFunction(value)) {
	    var n = value.name ? ': ' + value.name : '';
	    base = ' [Function' + n + ']';
	  }

	  // Make RegExps say that they are RegExps
	  if (isRegExp(value)) {
	    base = ' ' + RegExp.prototype.toString.call(value);
	  }

	  // Make dates with properties first say the date
	  if (isDate(value)) {
	    base = ' ' + Date.prototype.toUTCString.call(value);
	  }

	  // Make error with message first say the error
	  if (isError(value)) {
	    base = ' ' + formatError(value);
	  }

	  if (keys.length === 0 && (!array || value.length == 0)) {
	    return braces[0] + base + braces[1];
	  }

	  if (recurseTimes < 0) {
	    if (isRegExp(value)) {
	      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
	    } else {
	      return ctx.stylize('[Object]', 'special');
	    }
	  }

	  ctx.seen.push(value);

	  var output;
	  if (array) {
	    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
	  } else {
	    output = keys.map(function(key) {
	      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
	    });
	  }

	  ctx.seen.pop();

	  return reduceToSingleString(output, base, braces);
	}


	function formatPrimitive(ctx, value) {
	  if (isUndefined(value))
	    return ctx.stylize('undefined', 'undefined');
	  if (isString(value)) {
	    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
	                                             .replace(/'/g, "\\'")
	                                             .replace(/\\"/g, '"') + '\'';
	    return ctx.stylize(simple, 'string');
	  }
	  if (isNumber(value))
	    return ctx.stylize('' + value, 'number');
	  if (isBoolean(value))
	    return ctx.stylize('' + value, 'boolean');
	  // For some reason typeof null is "object", so special case here.
	  if (isNull(value))
	    return ctx.stylize('null', 'null');
	}


	function formatError(value) {
	  return '[' + Error.prototype.toString.call(value) + ']';
	}


	function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
	  var output = [];
	  for (var i = 0, l = value.length; i < l; ++i) {
	    if (hasOwnProperty(value, String(i))) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          String(i), true));
	    } else {
	      output.push('');
	    }
	  }
	  keys.forEach(function(key) {
	    if (!key.match(/^\d+$/)) {
	      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
	          key, true));
	    }
	  });
	  return output;
	}


	function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
	  var name, str, desc;
	  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
	  if (desc.get) {
	    if (desc.set) {
	      str = ctx.stylize('[Getter/Setter]', 'special');
	    } else {
	      str = ctx.stylize('[Getter]', 'special');
	    }
	  } else {
	    if (desc.set) {
	      str = ctx.stylize('[Setter]', 'special');
	    }
	  }
	  if (!hasOwnProperty(visibleKeys, key)) {
	    name = '[' + key + ']';
	  }
	  if (!str) {
	    if (ctx.seen.indexOf(desc.value) < 0) {
	      if (isNull(recurseTimes)) {
	        str = formatValue(ctx, desc.value, null);
	      } else {
	        str = formatValue(ctx, desc.value, recurseTimes - 1);
	      }
	      if (str.indexOf('\n') > -1) {
	        if (array) {
	          str = str.split('\n').map(function(line) {
	            return '  ' + line;
	          }).join('\n').substr(2);
	        } else {
	          str = '\n' + str.split('\n').map(function(line) {
	            return '   ' + line;
	          }).join('\n');
	        }
	      }
	    } else {
	      str = ctx.stylize('[Circular]', 'special');
	    }
	  }
	  if (isUndefined(name)) {
	    if (array && key.match(/^\d+$/)) {
	      return str;
	    }
	    name = JSON.stringify('' + key);
	    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
	      name = name.substr(1, name.length - 2);
	      name = ctx.stylize(name, 'name');
	    } else {
	      name = name.replace(/'/g, "\\'")
	                 .replace(/\\"/g, '"')
	                 .replace(/(^"|"$)/g, "'");
	      name = ctx.stylize(name, 'string');
	    }
	  }

	  return name + ': ' + str;
	}


	function reduceToSingleString(output, base, braces) {
	  var numLinesEst = 0;
	  var length = output.reduce(function(prev, cur) {
	    numLinesEst++;
	    if (cur.indexOf('\n') >= 0) numLinesEst++;
	    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
	  }, 0);

	  if (length > 60) {
	    return braces[0] +
	           (base === '' ? '' : base + '\n ') +
	           ' ' +
	           output.join(',\n  ') +
	           ' ' +
	           braces[1];
	  }

	  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
	}


	// NOTE: These type checking functions intentionally don't use `instanceof`
	// because it is fragile and can be easily faked with `Object.create()`.
	function isArray(ar) {
	  return Array.isArray(ar);
	}
	exports.isArray = isArray;

	function isBoolean(arg) {
	  return typeof arg === 'boolean';
	}
	exports.isBoolean = isBoolean;

	function isNull(arg) {
	  return arg === null;
	}
	exports.isNull = isNull;

	function isNullOrUndefined(arg) {
	  return arg == null;
	}
	exports.isNullOrUndefined = isNullOrUndefined;

	function isNumber(arg) {
	  return typeof arg === 'number';
	}
	exports.isNumber = isNumber;

	function isString(arg) {
	  return typeof arg === 'string';
	}
	exports.isString = isString;

	function isSymbol(arg) {
	  return typeof arg === 'symbol';
	}
	exports.isSymbol = isSymbol;

	function isUndefined(arg) {
	  return arg === void 0;
	}
	exports.isUndefined = isUndefined;

	function isRegExp(re) {
	  return isObject(re) && objectToString(re) === '[object RegExp]';
	}
	exports.isRegExp = isRegExp;

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}
	exports.isObject = isObject;

	function isDate(d) {
	  return isObject(d) && objectToString(d) === '[object Date]';
	}
	exports.isDate = isDate;

	function isError(e) {
	  return isObject(e) &&
	      (objectToString(e) === '[object Error]' || e instanceof Error);
	}
	exports.isError = isError;

	function isFunction(arg) {
	  return typeof arg === 'function';
	}
	exports.isFunction = isFunction;

	function isPrimitive(arg) {
	  return arg === null ||
	         typeof arg === 'boolean' ||
	         typeof arg === 'number' ||
	         typeof arg === 'string' ||
	         typeof arg === 'symbol' ||  // ES6 symbol
	         typeof arg === 'undefined';
	}
	exports.isPrimitive = isPrimitive;

	exports.isBuffer = __webpack_require__(74);

	function objectToString(o) {
	  return Object.prototype.toString.call(o);
	}


	function pad(n) {
	  return n < 10 ? '0' + n.toString(10) : n.toString(10);
	}


	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
	              'Oct', 'Nov', 'Dec'];

	// 26 Feb 16:19:34
	function timestamp() {
	  var d = new Date();
	  var time = [pad(d.getHours()),
	              pad(d.getMinutes()),
	              pad(d.getSeconds())].join(':');
	  return [d.getDate(), months[d.getMonth()], time].join(' ');
	}


	// log is just a thin wrapper to console.log that prepends a timestamp
	exports.log = function() {
	  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
	};


	/**
	 * Inherit the prototype methods from one constructor into another.
	 *
	 * The Function.prototype.inherits from lang.js rewritten as a standalone
	 * function (not on Function.prototype). NOTE: If this file is to be loaded
	 * during bootstrapping this function needs to be rewritten using some native
	 * functions as prototype setup using normal JavaScript does not work as
	 * expected during bootstrapping (see mirror.js in r114903).
	 *
	 * @param {function} ctor Constructor function which needs to inherit the
	 *     prototype.
	 * @param {function} superCtor Constructor function to inherit prototype from.
	 */
	exports.inherits = __webpack_require__(75);

	exports._extend = function(origin, add) {
	  // Don't do anything if add isn't an object
	  if (!add || !isObject(add)) return origin;

	  var keys = Object.keys(add);
	  var i = keys.length;
	  while (i--) {
	    origin[keys[i]] = add[keys[i]];
	  }
	  return origin;
	};

	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(73)))

/***/ },
/* 73 */
/***/ function(module, exports) {

	// shim for using process in browser

	var process = module.exports = {};
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = setTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    clearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        setTimeout(drainQueue, 0);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 74 */
/***/ function(module, exports) {

	module.exports = function isBuffer(arg) {
	  return arg && typeof arg === 'object'
	    && typeof arg.copy === 'function'
	    && typeof arg.fill === 'function'
	    && typeof arg.readUInt8 === 'function';
	}

/***/ },
/* 75 */
/***/ function(module, exports) {

	if (typeof Object.create === 'function') {
	  // implementation from standard node.js 'util' module
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    ctor.prototype = Object.create(superCtor.prototype, {
	      constructor: {
	        value: ctor,
	        enumerable: false,
	        writable: true,
	        configurable: true
	      }
	    });
	  };
	} else {
	  // old school shim for old browsers
	  module.exports = function inherits(ctor, superCtor) {
	    ctor.super_ = superCtor
	    var TempCtor = function () {}
	    TempCtor.prototype = superCtor.prototype
	    ctor.prototype = new TempCtor()
	    ctor.prototype.constructor = ctor
	  }
	}


/***/ },
/* 76 */
/***/ function(module, exports, __webpack_require__) {

	
	/**
	 * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined
	 * in FIPS 180-2
	 * Version 2.2-beta Copyright Angel Marin, Paul Johnston 2000 - 2009.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 *
	 */

	var inherits = __webpack_require__(72).inherits

	module.exports = function (Buffer, Hash) {

	  var K = [
	      0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
	      0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
	      0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
	      0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
	      0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
	      0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
	      0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
	      0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
	      0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
	      0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
	      0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
	      0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
	      0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
	      0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
	      0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
	      0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2
	    ]

	  var W = new Array(64)

	  function Sha256() {
	    this.init()

	    this._w = W //new Array(64)

	    Hash.call(this, 16*4, 14*4)
	  }

	  inherits(Sha256, Hash)

	  Sha256.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, n) {
	    return (X >>> n) | (X << (32 - n));
	  }

	  function R (X, n) {
	    return (X >>> n);
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  function Sigma0256 (x) {
	    return (S(x, 2) ^ S(x, 13) ^ S(x, 22));
	  }

	  function Sigma1256 (x) {
	    return (S(x, 6) ^ S(x, 11) ^ S(x, 25));
	  }

	  function Gamma0256 (x) {
	    return (S(x, 7) ^ S(x, 18) ^ R(x, 3));
	  }

	  function Gamma1256 (x) {
	    return (S(x, 17) ^ S(x, 19) ^ R(x, 10));
	  }

	  Sha256.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var T1, T2

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    for (var j = 0; j < 64; j++) {
	      var w = W[j] = j < 16
	        ? M.readInt32BE(j * 4)
	        : Gamma1256(W[j - 2]) + W[j - 7] + Gamma0256(W[j - 15]) + W[j - 16]

	      T1 = h + Sigma1256(e) + Ch(e, f, g) + K[j] + w

	      T2 = Sigma0256(a) + Maj(a, b, c);
	      h = g; g = f; f = e; e = d + T1; d = c; c = b; b = a; a = T1 + T2;
	    }

	    this._a = (a + this._a) | 0
	    this._b = (b + this._b) | 0
	    this._c = (c + this._c) | 0
	    this._d = (d + this._d) | 0
	    this._e = (e + this._e) | 0
	    this._f = (f + this._f) | 0
	    this._g = (g + this._g) | 0
	    this._h = (h + this._h) | 0

	  };

	  Sha256.prototype._hash = function () {
	    var H = new Buffer(32)

	    H.writeInt32BE(this._a,  0)
	    H.writeInt32BE(this._b,  4)
	    H.writeInt32BE(this._c,  8)
	    H.writeInt32BE(this._d, 12)
	    H.writeInt32BE(this._e, 16)
	    H.writeInt32BE(this._f, 20)
	    H.writeInt32BE(this._g, 24)
	    H.writeInt32BE(this._h, 28)

	    return H
	  }

	  return Sha256

	}


/***/ },
/* 77 */
/***/ function(module, exports, __webpack_require__) {

	var inherits = __webpack_require__(72).inherits

	module.exports = function (Buffer, Hash) {
	  var K = [
	    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
	    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
	    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
	    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
	    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
	    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
	    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
	    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
	    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
	    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
	    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
	    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
	    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
	    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
	    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
	    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
	    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
	    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
	    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
	    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
	    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
	    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
	    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
	    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
	    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
	    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
	    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
	    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
	    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
	    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
	    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
	    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
	    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
	    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
	    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
	    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
	    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
	    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
	    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
	    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
	  ]

	  var W = new Array(160)

	  function Sha512() {
	    this.init()
	    this._w = W

	    Hash.call(this, 128, 112)
	  }

	  inherits(Sha512, Hash)

	  Sha512.prototype.init = function () {

	    this._a = 0x6a09e667|0
	    this._b = 0xbb67ae85|0
	    this._c = 0x3c6ef372|0
	    this._d = 0xa54ff53a|0
	    this._e = 0x510e527f|0
	    this._f = 0x9b05688c|0
	    this._g = 0x1f83d9ab|0
	    this._h = 0x5be0cd19|0

	    this._al = 0xf3bcc908|0
	    this._bl = 0x84caa73b|0
	    this._cl = 0xfe94f82b|0
	    this._dl = 0x5f1d36f1|0
	    this._el = 0xade682d1|0
	    this._fl = 0x2b3e6c1f|0
	    this._gl = 0xfb41bd6b|0
	    this._hl = 0x137e2179|0

	    this._len = this._s = 0

	    return this
	  }

	  function S (X, Xl, n) {
	    return (X >>> n) | (Xl << (32 - n))
	  }

	  function Ch (x, y, z) {
	    return ((x & y) ^ ((~x) & z));
	  }

	  function Maj (x, y, z) {
	    return ((x & y) ^ (x & z) ^ (y & z));
	  }

	  Sha512.prototype._update = function(M) {

	    var W = this._w
	    var a, b, c, d, e, f, g, h
	    var al, bl, cl, dl, el, fl, gl, hl

	    a = this._a | 0
	    b = this._b | 0
	    c = this._c | 0
	    d = this._d | 0
	    e = this._e | 0
	    f = this._f | 0
	    g = this._g | 0
	    h = this._h | 0

	    al = this._al | 0
	    bl = this._bl | 0
	    cl = this._cl | 0
	    dl = this._dl | 0
	    el = this._el | 0
	    fl = this._fl | 0
	    gl = this._gl | 0
	    hl = this._hl | 0

	    for (var i = 0; i < 80; i++) {
	      var j = i * 2

	      var Wi, Wil

	      if (i < 16) {
	        Wi = W[j] = M.readInt32BE(j * 4)
	        Wil = W[j + 1] = M.readInt32BE(j * 4 + 4)

	      } else {
	        var x  = W[j - 15*2]
	        var xl = W[j - 15*2 + 1]
	        var gamma0  = S(x, xl, 1) ^ S(x, xl, 8) ^ (x >>> 7)
	        var gamma0l = S(xl, x, 1) ^ S(xl, x, 8) ^ S(xl, x, 7)

	        x  = W[j - 2*2]
	        xl = W[j - 2*2 + 1]
	        var gamma1  = S(x, xl, 19) ^ S(xl, x, 29) ^ (x >>> 6)
	        var gamma1l = S(xl, x, 19) ^ S(x, xl, 29) ^ S(xl, x, 6)

	        // W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16]
	        var Wi7  = W[j - 7*2]
	        var Wi7l = W[j - 7*2 + 1]

	        var Wi16  = W[j - 16*2]
	        var Wi16l = W[j - 16*2 + 1]

	        Wil = gamma0l + Wi7l
	        Wi  = gamma0  + Wi7 + ((Wil >>> 0) < (gamma0l >>> 0) ? 1 : 0)
	        Wil = Wil + gamma1l
	        Wi  = Wi  + gamma1  + ((Wil >>> 0) < (gamma1l >>> 0) ? 1 : 0)
	        Wil = Wil + Wi16l
	        Wi  = Wi  + Wi16 + ((Wil >>> 0) < (Wi16l >>> 0) ? 1 : 0)

	        W[j] = Wi
	        W[j + 1] = Wil
	      }

	      var maj = Maj(a, b, c)
	      var majl = Maj(al, bl, cl)

	      var sigma0h = S(a, al, 28) ^ S(al, a, 2) ^ S(al, a, 7)
	      var sigma0l = S(al, a, 28) ^ S(a, al, 2) ^ S(a, al, 7)
	      var sigma1h = S(e, el, 14) ^ S(e, el, 18) ^ S(el, e, 9)
	      var sigma1l = S(el, e, 14) ^ S(el, e, 18) ^ S(e, el, 9)

	      // t1 = h + sigma1 + ch + K[i] + W[i]
	      var Ki = K[j]
	      var Kil = K[j + 1]

	      var ch = Ch(e, f, g)
	      var chl = Ch(el, fl, gl)

	      var t1l = hl + sigma1l
	      var t1 = h + sigma1h + ((t1l >>> 0) < (hl >>> 0) ? 1 : 0)
	      t1l = t1l + chl
	      t1 = t1 + ch + ((t1l >>> 0) < (chl >>> 0) ? 1 : 0)
	      t1l = t1l + Kil
	      t1 = t1 + Ki + ((t1l >>> 0) < (Kil >>> 0) ? 1 : 0)
	      t1l = t1l + Wil
	      t1 = t1 + Wi + ((t1l >>> 0) < (Wil >>> 0) ? 1 : 0)

	      // t2 = sigma0 + maj
	      var t2l = sigma0l + majl
	      var t2 = sigma0h + maj + ((t2l >>> 0) < (sigma0l >>> 0) ? 1 : 0)

	      h  = g
	      hl = gl
	      g  = f
	      gl = fl
	      f  = e
	      fl = el
	      el = (dl + t1l) | 0
	      e  = (d + t1 + ((el >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	      d  = c
	      dl = cl
	      c  = b
	      cl = bl
	      b  = a
	      bl = al
	      al = (t1l + t2l) | 0
	      a  = (t1 + t2 + ((al >>> 0) < (t1l >>> 0) ? 1 : 0)) | 0
	    }

	    this._al = (this._al + al) | 0
	    this._bl = (this._bl + bl) | 0
	    this._cl = (this._cl + cl) | 0
	    this._dl = (this._dl + dl) | 0
	    this._el = (this._el + el) | 0
	    this._fl = (this._fl + fl) | 0
	    this._gl = (this._gl + gl) | 0
	    this._hl = (this._hl + hl) | 0

	    this._a = (this._a + a + ((this._al >>> 0) < (al >>> 0) ? 1 : 0)) | 0
	    this._b = (this._b + b + ((this._bl >>> 0) < (bl >>> 0) ? 1 : 0)) | 0
	    this._c = (this._c + c + ((this._cl >>> 0) < (cl >>> 0) ? 1 : 0)) | 0
	    this._d = (this._d + d + ((this._dl >>> 0) < (dl >>> 0) ? 1 : 0)) | 0
	    this._e = (this._e + e + ((this._el >>> 0) < (el >>> 0) ? 1 : 0)) | 0
	    this._f = (this._f + f + ((this._fl >>> 0) < (fl >>> 0) ? 1 : 0)) | 0
	    this._g = (this._g + g + ((this._gl >>> 0) < (gl >>> 0) ? 1 : 0)) | 0
	    this._h = (this._h + h + ((this._hl >>> 0) < (hl >>> 0) ? 1 : 0)) | 0
	  }

	  Sha512.prototype._hash = function () {
	    var H = new Buffer(64)

	    function writeInt64BE(h, l, offset) {
	      H.writeInt32BE(h, offset)
	      H.writeInt32BE(l, offset + 4)
	    }

	    writeInt64BE(this._a, this._al, 0)
	    writeInt64BE(this._b, this._bl, 8)
	    writeInt64BE(this._c, this._cl, 16)
	    writeInt64BE(this._d, this._dl, 24)
	    writeInt64BE(this._e, this._el, 32)
	    writeInt64BE(this._f, this._fl, 40)
	    writeInt64BE(this._g, this._gl, 48)
	    writeInt64BE(this._h, this._hl, 56)

	    return H
	  }

	  return Sha512

	}


/***/ },
/* 78 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
	 * Digest Algorithm, as defined in RFC 1321.
	 * Version 2.1 Copyright (C) Paul Johnston 1999 - 2002.
	 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
	 * Distributed under the BSD License
	 * See http://pajhome.org.uk/crypt/md5 for more info.
	 */

	var helpers = __webpack_require__(79);

	/*
	 * Calculate the MD5 of an array of little-endian words, and a bit length
	 */
	function core_md5(x, len)
	{
	  /* append padding */
	  x[len >> 5] |= 0x80 << ((len) % 32);
	  x[(((len + 64) >>> 9) << 4) + 14] = len;

	  var a =  1732584193;
	  var b = -271733879;
	  var c = -1732584194;
	  var d =  271733878;

	  for(var i = 0; i < x.length; i += 16)
	  {
	    var olda = a;
	    var oldb = b;
	    var oldc = c;
	    var oldd = d;

	    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
	    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
	    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
	    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
	    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
	    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
	    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
	    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
	    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
	    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
	    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
	    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
	    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
	    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
	    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
	    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

	    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
	    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
	    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
	    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
	    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
	    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
	    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
	    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
	    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
	    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
	    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
	    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
	    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
	    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
	    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
	    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

	    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
	    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
	    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
	    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
	    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
	    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
	    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
	    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
	    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
	    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
	    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
	    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
	    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
	    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
	    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
	    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

	    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
	    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
	    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
	    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
	    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
	    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
	    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
	    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
	    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
	    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
	    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
	    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
	    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
	    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
	    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
	    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

	    a = safe_add(a, olda);
	    b = safe_add(b, oldb);
	    c = safe_add(c, oldc);
	    d = safe_add(d, oldd);
	  }
	  return Array(a, b, c, d);

	}

	/*
	 * These functions implement the four basic operations the algorithm uses.
	 */
	function md5_cmn(q, a, b, x, s, t)
	{
	  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
	}
	function md5_ff(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
	}
	function md5_gg(a, b, c, d, x, s, t)
	{
	  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
	}
	function md5_hh(a, b, c, d, x, s, t)
	{
	  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
	}
	function md5_ii(a, b, c, d, x, s, t)
	{
	  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
	}

	/*
	 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
	 * to work around bugs in some JS interpreters.
	 */
	function safe_add(x, y)
	{
	  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
	  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
	  return (msw << 16) | (lsw & 0xFFFF);
	}

	/*
	 * Bitwise rotate a 32-bit number to the left.
	 */
	function bit_rol(num, cnt)
	{
	  return (num << cnt) | (num >>> (32 - cnt));
	}

	module.exports = function md5(buf) {
	  return helpers.hash(buf, core_md5, 16);
	};


/***/ },
/* 79 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var intSize = 4;
	var zeroBuffer = new Buffer(intSize); zeroBuffer.fill(0);
	var chrsz = 8;

	function toArray(buf, bigEndian) {
	  if ((buf.length % intSize) !== 0) {
	    var len = buf.length + (intSize - (buf.length % intSize));
	    buf = Buffer.concat([buf, zeroBuffer], len);
	  }

	  var arr = [];
	  var fn = bigEndian ? buf.readInt32BE : buf.readInt32LE;
	  for (var i = 0; i < buf.length; i += intSize) {
	    arr.push(fn.call(buf, i));
	  }
	  return arr;
	}

	function toBuffer(arr, size, bigEndian) {
	  var buf = new Buffer(size);
	  var fn = bigEndian ? buf.writeInt32BE : buf.writeInt32LE;
	  for (var i = 0; i < arr.length; i++) {
	    fn.call(buf, arr[i], i * 4, true);
	  }
	  return buf;
	}

	function hash(buf, fn, hashSize, bigEndian) {
	  if (!Buffer.isBuffer(buf)) buf = new Buffer(buf);
	  var arr = fn(toArray(buf, bigEndian), buf.length * chrsz);
	  return toBuffer(arr, hashSize, bigEndian);
	}

	module.exports = { hash: hash };

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 80 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {
	module.exports = ripemd160



	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/

	// Constants table
	var zl = [
	    0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15,
	    7,  4, 13,  1, 10,  6, 15,  3, 12,  0,  9,  5,  2, 14, 11,  8,
	    3, 10, 14,  4,  9, 15,  8,  1,  2,  7,  0,  6, 13, 11,  5, 12,
	    1,  9, 11, 10,  0,  8, 12,  4, 13,  3,  7, 15, 14,  5,  6,  2,
	    4,  0,  5,  9,  7, 12,  2, 10, 14,  1,  3,  8, 11,  6, 15, 13];
	var zr = [
	    5, 14,  7,  0,  9,  2, 11,  4, 13,  6, 15,  8,  1, 10,  3, 12,
	    6, 11,  3,  7,  0, 13,  5, 10, 14, 15,  8, 12,  4,  9,  1,  2,
	    15,  5,  1,  3,  7, 14,  6,  9, 11,  8, 12,  2, 10,  0,  4, 13,
	    8,  6,  4,  1,  3, 11, 15,  0,  5, 12,  2, 13,  9,  7, 10, 14,
	    12, 15, 10,  4,  1,  5,  8,  7,  6,  2, 13, 14,  0,  3,  9, 11];
	var sl = [
	     11, 14, 15, 12,  5,  8,  7,  9, 11, 13, 14, 15,  6,  7,  9,  8,
	    7, 6,   8, 13, 11,  9,  7, 15,  7, 12, 15,  9, 11,  7, 13, 12,
	    11, 13,  6,  7, 14,  9, 13, 15, 14,  8, 13,  6,  5, 12,  7,  5,
	      11, 12, 14, 15, 14, 15,  9,  8,  9, 14,  5,  6,  8,  6,  5, 12,
	    9, 15,  5, 11,  6,  8, 13, 12,  5, 12, 13, 14, 11,  8,  5,  6 ];
	var sr = [
	    8,  9,  9, 11, 13, 15, 15,  5,  7,  7,  8, 11, 14, 14, 12,  6,
	    9, 13, 15,  7, 12,  8,  9, 11,  7,  7, 12,  7,  6, 15, 13, 11,
	    9,  7, 15, 11,  8,  6,  6, 14, 12, 13,  5, 14, 13, 13,  7,  5,
	    15,  5,  8, 11, 14, 14,  6, 14,  6,  9, 12,  9, 12,  5, 15,  8,
	    8,  5, 12,  9, 12,  5, 14,  6,  8, 13,  6,  5, 15, 13, 11, 11 ];

	var hl =  [ 0x00000000, 0x5A827999, 0x6ED9EBA1, 0x8F1BBCDC, 0xA953FD4E];
	var hr =  [ 0x50A28BE6, 0x5C4DD124, 0x6D703EF3, 0x7A6D76E9, 0x00000000];

	var bytesToWords = function (bytes) {
	  var words = [];
	  for (var i = 0, b = 0; i < bytes.length; i++, b += 8) {
	    words[b >>> 5] |= bytes[i] << (24 - b % 32);
	  }
	  return words;
	};

	var wordsToBytes = function (words) {
	  var bytes = [];
	  for (var b = 0; b < words.length * 32; b += 8) {
	    bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
	  }
	  return bytes;
	};

	var processBlock = function (H, M, offset) {

	  // Swap endian
	  for (var i = 0; i < 16; i++) {
	    var offset_i = offset + i;
	    var M_offset_i = M[offset_i];

	    // Swap
	    M[offset_i] = (
	        (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
	        (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
	    );
	  }

	  // Working variables
	  var al, bl, cl, dl, el;
	  var ar, br, cr, dr, er;

	  ar = al = H[0];
	  br = bl = H[1];
	  cr = cl = H[2];
	  dr = dl = H[3];
	  er = el = H[4];
	  // Computation
	  var t;
	  for (var i = 0; i < 80; i += 1) {
	    t = (al +  M[offset+zl[i]])|0;
	    if (i<16){
	        t +=  f1(bl,cl,dl) + hl[0];
	    } else if (i<32) {
	        t +=  f2(bl,cl,dl) + hl[1];
	    } else if (i<48) {
	        t +=  f3(bl,cl,dl) + hl[2];
	    } else if (i<64) {
	        t +=  f4(bl,cl,dl) + hl[3];
	    } else {// if (i<80) {
	        t +=  f5(bl,cl,dl) + hl[4];
	    }
	    t = t|0;
	    t =  rotl(t,sl[i]);
	    t = (t+el)|0;
	    al = el;
	    el = dl;
	    dl = rotl(cl, 10);
	    cl = bl;
	    bl = t;

	    t = (ar + M[offset+zr[i]])|0;
	    if (i<16){
	        t +=  f5(br,cr,dr) + hr[0];
	    } else if (i<32) {
	        t +=  f4(br,cr,dr) + hr[1];
	    } else if (i<48) {
	        t +=  f3(br,cr,dr) + hr[2];
	    } else if (i<64) {
	        t +=  f2(br,cr,dr) + hr[3];
	    } else {// if (i<80) {
	        t +=  f1(br,cr,dr) + hr[4];
	    }
	    t = t|0;
	    t =  rotl(t,sr[i]) ;
	    t = (t+er)|0;
	    ar = er;
	    er = dr;
	    dr = rotl(cr, 10);
	    cr = br;
	    br = t;
	  }
	  // Intermediate hash value
	  t    = (H[1] + cl + dr)|0;
	  H[1] = (H[2] + dl + er)|0;
	  H[2] = (H[3] + el + ar)|0;
	  H[3] = (H[4] + al + br)|0;
	  H[4] = (H[0] + bl + cr)|0;
	  H[0] =  t;
	};

	function f1(x, y, z) {
	  return ((x) ^ (y) ^ (z));
	}

	function f2(x, y, z) {
	  return (((x)&(y)) | ((~x)&(z)));
	}

	function f3(x, y, z) {
	  return (((x) | (~(y))) ^ (z));
	}

	function f4(x, y, z) {
	  return (((x) & (z)) | ((y)&(~(z))));
	}

	function f5(x, y, z) {
	  return ((x) ^ ((y) |(~(z))));
	}

	function rotl(x,n) {
	  return (x<<n) | (x>>>(32-n));
	}

	function ripemd160(message) {
	  var H = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];

	  if (typeof message == 'string')
	    message = new Buffer(message, 'utf8');

	  var m = bytesToWords(message);

	  var nBitsLeft = message.length * 8;
	  var nBitsTotal = message.length * 8;

	  // Add padding
	  m[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
	  m[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
	      (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
	      (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
	  );

	  for (var i=0 ; i<m.length; i += 16) {
	    processBlock(H, m, i);
	  }

	  // Swap endian
	  for (var i = 0; i < 5; i++) {
	      // Shortcut
	    var H_i = H[i];

	    // Swap
	    H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
	          (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
	  }

	  var digestbytes = wordsToBytes(H);
	  return new Buffer(digestbytes);
	}



	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 81 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {var createHash = __webpack_require__(68)

	var zeroBuffer = new Buffer(128)
	zeroBuffer.fill(0)

	module.exports = Hmac

	function Hmac (alg, key) {
	  if(!(this instanceof Hmac)) return new Hmac(alg, key)
	  this._opad = opad
	  this._alg = alg

	  var blocksize = (alg === 'sha512') ? 128 : 64

	  key = this._key = !Buffer.isBuffer(key) ? new Buffer(key) : key

	  if(key.length > blocksize) {
	    key = createHash(alg).update(key).digest()
	  } else if(key.length < blocksize) {
	    key = Buffer.concat([key, zeroBuffer], blocksize)
	  }

	  var ipad = this._ipad = new Buffer(blocksize)
	  var opad = this._opad = new Buffer(blocksize)

	  for(var i = 0; i < blocksize; i++) {
	    ipad[i] = key[i] ^ 0x36
	    opad[i] = key[i] ^ 0x5C
	  }

	  this._hash = createHash(alg).update(ipad)
	}

	Hmac.prototype.update = function (data, enc) {
	  this._hash.update(data, enc)
	  return this
	}

	Hmac.prototype.digest = function (enc) {
	  var h = this._hash.digest()
	  return createHash(this._alg).update(this._opad).update(h).digest(enc)
	}


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 82 */
/***/ function(module, exports, __webpack_require__) {

	var pbkdf2Export = __webpack_require__(83)

	module.exports = function (crypto, exports) {
	  exports = exports || {}

	  var exported = pbkdf2Export(crypto)

	  exports.pbkdf2 = exported.pbkdf2
	  exports.pbkdf2Sync = exported.pbkdf2Sync

	  return exports
	}


/***/ },
/* 83 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {module.exports = function(crypto) {
	  function pbkdf2(password, salt, iterations, keylen, digest, callback) {
	    if ('function' === typeof digest) {
	      callback = digest
	      digest = undefined
	    }

	    if ('function' !== typeof callback)
	      throw new Error('No callback provided to pbkdf2')

	    setTimeout(function() {
	      var result

	      try {
	        result = pbkdf2Sync(password, salt, iterations, keylen, digest)
	      } catch (e) {
	        return callback(e)
	      }

	      callback(undefined, result)
	    })
	  }

	  function pbkdf2Sync(password, salt, iterations, keylen, digest) {
	    if ('number' !== typeof iterations)
	      throw new TypeError('Iterations not a number')

	    if (iterations < 0)
	      throw new TypeError('Bad iterations')

	    if ('number' !== typeof keylen)
	      throw new TypeError('Key length not a number')

	    if (keylen < 0)
	      throw new TypeError('Bad key length')

	    digest = digest || 'sha1'

	    if (!Buffer.isBuffer(password)) password = new Buffer(password)
	    if (!Buffer.isBuffer(salt)) salt = new Buffer(salt)

	    var hLen, l = 1, r, T
	    var DK = new Buffer(keylen)
	    var block1 = new Buffer(salt.length + 4)
	    salt.copy(block1, 0, 0, salt.length)

	    for (var i = 1; i <= l; i++) {
	      block1.writeUInt32BE(i, salt.length)

	      var U = crypto.createHmac(digest, password).update(block1).digest()

	      if (!hLen) {
	        hLen = U.length
	        T = new Buffer(hLen)
	        l = Math.ceil(keylen / hLen)
	        r = keylen - (l - 1) * hLen

	        if (keylen > (Math.pow(2, 32) - 1) * hLen)
	          throw new TypeError('keylen exceeds maximum length')
	      }

	      U.copy(T, 0, 0, hLen)

	      for (var j = 1; j < iterations; j++) {
	        U = crypto.createHmac(digest, password).update(U).digest()

	        for (var k = 0; k < hLen; k++) {
	          T[k] ^= U[k]
	        }
	      }

	      var destPos = (i - 1) * hLen
	      var len = (i == l ? r : hLen)
	      T.copy(DK, destPos, 0, len)
	    }

	    return DK
	  }

	  return {
	    pbkdf2: pbkdf2,
	    pbkdf2Sync: pbkdf2Sync
	  }
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 84 */
/***/ function(module, exports, __webpack_require__) {

	var require;var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(process, global, module) {/*!
	 * @overview es6-promise - a tiny implementation of Promises/A+.
	 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
	 * @license   Licensed under MIT license
	 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
	 * @version   3.1.2
	 */

	(function() {
	    "use strict";
	    function lib$es6$promise$utils$$objectOrFunction(x) {
	      return typeof x === 'function' || (typeof x === 'object' && x !== null);
	    }

	    function lib$es6$promise$utils$$isFunction(x) {
	      return typeof x === 'function';
	    }

	    function lib$es6$promise$utils$$isMaybeThenable(x) {
	      return typeof x === 'object' && x !== null;
	    }

	    var lib$es6$promise$utils$$_isArray;
	    if (!Array.isArray) {
	      lib$es6$promise$utils$$_isArray = function (x) {
	        return Object.prototype.toString.call(x) === '[object Array]';
	      };
	    } else {
	      lib$es6$promise$utils$$_isArray = Array.isArray;
	    }

	    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
	    var lib$es6$promise$asap$$len = 0;
	    var lib$es6$promise$asap$$vertxNext;
	    var lib$es6$promise$asap$$customSchedulerFn;

	    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
	      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
	      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
	      lib$es6$promise$asap$$len += 2;
	      if (lib$es6$promise$asap$$len === 2) {
	        // If len is 2, that means that we need to schedule an async flush.
	        // If additional callbacks are queued before the queue is flushed, they
	        // will be processed by this flush that we are scheduling.
	        if (lib$es6$promise$asap$$customSchedulerFn) {
	          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
	        } else {
	          lib$es6$promise$asap$$scheduleFlush();
	        }
	      }
	    }

	    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
	      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
	    }

	    function lib$es6$promise$asap$$setAsap(asapFn) {
	      lib$es6$promise$asap$$asap = asapFn;
	    }

	    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
	    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
	    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
	    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

	    // test for web worker but not in IE10
	    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
	      typeof importScripts !== 'undefined' &&
	      typeof MessageChannel !== 'undefined';

	    // node
	    function lib$es6$promise$asap$$useNextTick() {
	      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
	      // see https://github.com/cujojs/when/issues/410 for details
	      return function() {
	        process.nextTick(lib$es6$promise$asap$$flush);
	      };
	    }

	    // vertx
	    function lib$es6$promise$asap$$useVertxTimer() {
	      return function() {
	        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
	      };
	    }

	    function lib$es6$promise$asap$$useMutationObserver() {
	      var iterations = 0;
	      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
	      var node = document.createTextNode('');
	      observer.observe(node, { characterData: true });

	      return function() {
	        node.data = (iterations = ++iterations % 2);
	      };
	    }

	    // web worker
	    function lib$es6$promise$asap$$useMessageChannel() {
	      var channel = new MessageChannel();
	      channel.port1.onmessage = lib$es6$promise$asap$$flush;
	      return function () {
	        channel.port2.postMessage(0);
	      };
	    }

	    function lib$es6$promise$asap$$useSetTimeout() {
	      return function() {
	        setTimeout(lib$es6$promise$asap$$flush, 1);
	      };
	    }

	    var lib$es6$promise$asap$$queue = new Array(1000);
	    function lib$es6$promise$asap$$flush() {
	      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
	        var callback = lib$es6$promise$asap$$queue[i];
	        var arg = lib$es6$promise$asap$$queue[i+1];

	        callback(arg);

	        lib$es6$promise$asap$$queue[i] = undefined;
	        lib$es6$promise$asap$$queue[i+1] = undefined;
	      }

	      lib$es6$promise$asap$$len = 0;
	    }

	    function lib$es6$promise$asap$$attemptVertx() {
	      try {
	        var r = require;
	        var vertx = __webpack_require__(86);
	        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
	        return lib$es6$promise$asap$$useVertxTimer();
	      } catch(e) {
	        return lib$es6$promise$asap$$useSetTimeout();
	      }
	    }

	    var lib$es6$promise$asap$$scheduleFlush;
	    // Decide what async method to use to triggering processing of queued callbacks:
	    if (lib$es6$promise$asap$$isNode) {
	      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
	    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
	      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
	    } else if (lib$es6$promise$asap$$isWorker) {
	      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
	    } else if (lib$es6$promise$asap$$browserWindow === undefined && "function" === 'function') {
	      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
	    } else {
	      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
	    }
	    function lib$es6$promise$then$$then(onFulfillment, onRejection) {
	      var parent = this;
	      var state = parent._state;

	      if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
	        return this;
	      }

	      var child = new this.constructor(lib$es6$promise$$internal$$noop);
	      var result = parent._result;

	      if (state) {
	        var callback = arguments[state - 1];
	        lib$es6$promise$asap$$asap(function(){
	          lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
	        });
	      } else {
	        lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
	      }

	      return child;
	    }
	    var lib$es6$promise$then$$default = lib$es6$promise$then$$then;
	    function lib$es6$promise$promise$resolve$$resolve(object) {
	      /*jshint validthis:true */
	      var Constructor = this;

	      if (object && typeof object === 'object' && object.constructor === Constructor) {
	        return object;
	      }

	      var promise = new Constructor(lib$es6$promise$$internal$$noop);
	      lib$es6$promise$$internal$$resolve(promise, object);
	      return promise;
	    }
	    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;

	    function lib$es6$promise$$internal$$noop() {}

	    var lib$es6$promise$$internal$$PENDING   = void 0;
	    var lib$es6$promise$$internal$$FULFILLED = 1;
	    var lib$es6$promise$$internal$$REJECTED  = 2;

	    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

	    function lib$es6$promise$$internal$$selfFulfillment() {
	      return new TypeError("You cannot resolve a promise with itself");
	    }

	    function lib$es6$promise$$internal$$cannotReturnOwn() {
	      return new TypeError('A promises callback cannot return that same promise.');
	    }

	    function lib$es6$promise$$internal$$getThen(promise) {
	      try {
	        return promise.then;
	      } catch(error) {
	        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
	        return lib$es6$promise$$internal$$GET_THEN_ERROR;
	      }
	    }

	    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
	      try {
	        then.call(value, fulfillmentHandler, rejectionHandler);
	      } catch(e) {
	        return e;
	      }
	    }

	    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
	       lib$es6$promise$asap$$asap(function(promise) {
	        var sealed = false;
	        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
	          if (sealed) { return; }
	          sealed = true;
	          if (thenable !== value) {
	            lib$es6$promise$$internal$$resolve(promise, value);
	          } else {
	            lib$es6$promise$$internal$$fulfill(promise, value);
	          }
	        }, function(reason) {
	          if (sealed) { return; }
	          sealed = true;

	          lib$es6$promise$$internal$$reject(promise, reason);
	        }, 'Settle: ' + (promise._label || ' unknown promise'));

	        if (!sealed && error) {
	          sealed = true;
	          lib$es6$promise$$internal$$reject(promise, error);
	        }
	      }, promise);
	    }

	    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
	      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
	        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
	      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
	        lib$es6$promise$$internal$$reject(promise, thenable._result);
	      } else {
	        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
	          lib$es6$promise$$internal$$resolve(promise, value);
	        }, function(reason) {
	          lib$es6$promise$$internal$$reject(promise, reason);
	        });
	      }
	    }

	    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable, then) {
	      if (maybeThenable.constructor === promise.constructor &&
	          then === lib$es6$promise$then$$default &&
	          constructor.resolve === lib$es6$promise$promise$resolve$$default) {
	        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
	      } else {
	        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
	          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
	        } else if (then === undefined) {
	          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
	        } else if (lib$es6$promise$utils$$isFunction(then)) {
	          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
	        } else {
	          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
	        }
	      }
	    }

	    function lib$es6$promise$$internal$$resolve(promise, value) {
	      if (promise === value) {
	        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
	      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
	        lib$es6$promise$$internal$$handleMaybeThenable(promise, value, lib$es6$promise$$internal$$getThen(value));
	      } else {
	        lib$es6$promise$$internal$$fulfill(promise, value);
	      }
	    }

	    function lib$es6$promise$$internal$$publishRejection(promise) {
	      if (promise._onerror) {
	        promise._onerror(promise._result);
	      }

	      lib$es6$promise$$internal$$publish(promise);
	    }

	    function lib$es6$promise$$internal$$fulfill(promise, value) {
	      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

	      promise._result = value;
	      promise._state = lib$es6$promise$$internal$$FULFILLED;

	      if (promise._subscribers.length !== 0) {
	        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
	      }
	    }

	    function lib$es6$promise$$internal$$reject(promise, reason) {
	      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
	      promise._state = lib$es6$promise$$internal$$REJECTED;
	      promise._result = reason;

	      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
	    }

	    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
	      var subscribers = parent._subscribers;
	      var length = subscribers.length;

	      parent._onerror = null;

	      subscribers[length] = child;
	      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
	      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

	      if (length === 0 && parent._state) {
	        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
	      }
	    }

	    function lib$es6$promise$$internal$$publish(promise) {
	      var subscribers = promise._subscribers;
	      var settled = promise._state;

	      if (subscribers.length === 0) { return; }

	      var child, callback, detail = promise._result;

	      for (var i = 0; i < subscribers.length; i += 3) {
	        child = subscribers[i];
	        callback = subscribers[i + settled];

	        if (child) {
	          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
	        } else {
	          callback(detail);
	        }
	      }

	      promise._subscribers.length = 0;
	    }

	    function lib$es6$promise$$internal$$ErrorObject() {
	      this.error = null;
	    }

	    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

	    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
	      try {
	        return callback(detail);
	      } catch(e) {
	        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
	        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
	      }
	    }

	    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
	      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
	          value, error, succeeded, failed;

	      if (hasCallback) {
	        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

	        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
	          failed = true;
	          error = value.error;
	          value = null;
	        } else {
	          succeeded = true;
	        }

	        if (promise === value) {
	          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
	          return;
	        }

	      } else {
	        value = detail;
	        succeeded = true;
	      }

	      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
	        // noop
	      } else if (hasCallback && succeeded) {
	        lib$es6$promise$$internal$$resolve(promise, value);
	      } else if (failed) {
	        lib$es6$promise$$internal$$reject(promise, error);
	      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
	        lib$es6$promise$$internal$$fulfill(promise, value);
	      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
	        lib$es6$promise$$internal$$reject(promise, value);
	      }
	    }

	    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
	      try {
	        resolver(function resolvePromise(value){
	          lib$es6$promise$$internal$$resolve(promise, value);
	        }, function rejectPromise(reason) {
	          lib$es6$promise$$internal$$reject(promise, reason);
	        });
	      } catch(e) {
	        lib$es6$promise$$internal$$reject(promise, e);
	      }
	    }

	    function lib$es6$promise$promise$all$$all(entries) {
	      return new lib$es6$promise$enumerator$$default(this, entries).promise;
	    }
	    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
	    function lib$es6$promise$promise$race$$race(entries) {
	      /*jshint validthis:true */
	      var Constructor = this;

	      var promise = new Constructor(lib$es6$promise$$internal$$noop);

	      if (!lib$es6$promise$utils$$isArray(entries)) {
	        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
	        return promise;
	      }

	      var length = entries.length;

	      function onFulfillment(value) {
	        lib$es6$promise$$internal$$resolve(promise, value);
	      }

	      function onRejection(reason) {
	        lib$es6$promise$$internal$$reject(promise, reason);
	      }

	      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
	        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
	      }

	      return promise;
	    }
	    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
	    function lib$es6$promise$promise$reject$$reject(reason) {
	      /*jshint validthis:true */
	      var Constructor = this;
	      var promise = new Constructor(lib$es6$promise$$internal$$noop);
	      lib$es6$promise$$internal$$reject(promise, reason);
	      return promise;
	    }
	    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

	    var lib$es6$promise$promise$$counter = 0;

	    function lib$es6$promise$promise$$needsResolver() {
	      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
	    }

	    function lib$es6$promise$promise$$needsNew() {
	      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
	    }

	    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
	    /**
	      Promise objects represent the eventual result of an asynchronous operation. The
	      primary way of interacting with a promise is through its `then` method, which
	      registers callbacks to receive either a promise's eventual value or the reason
	      why the promise cannot be fulfilled.

	      Terminology
	      -----------

	      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
	      - `thenable` is an object or function that defines a `then` method.
	      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
	      - `exception` is a value that is thrown using the throw statement.
	      - `reason` is a value that indicates why a promise was rejected.
	      - `settled` the final resting state of a promise, fulfilled or rejected.

	      A promise can be in one of three states: pending, fulfilled, or rejected.

	      Promises that are fulfilled have a fulfillment value and are in the fulfilled
	      state.  Promises that are rejected have a rejection reason and are in the
	      rejected state.  A fulfillment value is never a thenable.

	      Promises can also be said to *resolve* a value.  If this value is also a
	      promise, then the original promise's settled state will match the value's
	      settled state.  So a promise that *resolves* a promise that rejects will
	      itself reject, and a promise that *resolves* a promise that fulfills will
	      itself fulfill.


	      Basic Usage:
	      ------------

	      ```js
	      var promise = new Promise(function(resolve, reject) {
	        // on success
	        resolve(value);

	        // on failure
	        reject(reason);
	      });

	      promise.then(function(value) {
	        // on fulfillment
	      }, function(reason) {
	        // on rejection
	      });
	      ```

	      Advanced Usage:
	      ---------------

	      Promises shine when abstracting away asynchronous interactions such as
	      `XMLHttpRequest`s.

	      ```js
	      function getJSON(url) {
	        return new Promise(function(resolve, reject){
	          var xhr = new XMLHttpRequest();

	          xhr.open('GET', url);
	          xhr.onreadystatechange = handler;
	          xhr.responseType = 'json';
	          xhr.setRequestHeader('Accept', 'application/json');
	          xhr.send();

	          function handler() {
	            if (this.readyState === this.DONE) {
	              if (this.status === 200) {
	                resolve(this.response);
	              } else {
	                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
	              }
	            }
	          };
	        });
	      }

	      getJSON('/posts.json').then(function(json) {
	        // on fulfillment
	      }, function(reason) {
	        // on rejection
	      });
	      ```

	      Unlike callbacks, promises are great composable primitives.

	      ```js
	      Promise.all([
	        getJSON('/posts'),
	        getJSON('/comments')
	      ]).then(function(values){
	        values[0] // => postsJSON
	        values[1] // => commentsJSON

	        return values;
	      });
	      ```

	      @class Promise
	      @param {function} resolver
	      Useful for tooling.
	      @constructor
	    */
	    function lib$es6$promise$promise$$Promise(resolver) {
	      this._id = lib$es6$promise$promise$$counter++;
	      this._state = undefined;
	      this._result = undefined;
	      this._subscribers = [];

	      if (lib$es6$promise$$internal$$noop !== resolver) {
	        typeof resolver !== 'function' && lib$es6$promise$promise$$needsResolver();
	        this instanceof lib$es6$promise$promise$$Promise ? lib$es6$promise$$internal$$initializePromise(this, resolver) : lib$es6$promise$promise$$needsNew();
	      }
	    }

	    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
	    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
	    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
	    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
	    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
	    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
	    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

	    lib$es6$promise$promise$$Promise.prototype = {
	      constructor: lib$es6$promise$promise$$Promise,

	    /**
	      The primary way of interacting with a promise is through its `then` method,
	      which registers callbacks to receive either a promise's eventual value or the
	      reason why the promise cannot be fulfilled.

	      ```js
	      findUser().then(function(user){
	        // user is available
	      }, function(reason){
	        // user is unavailable, and you are given the reason why
	      });
	      ```

	      Chaining
	      --------

	      The return value of `then` is itself a promise.  This second, 'downstream'
	      promise is resolved with the return value of the first promise's fulfillment
	      or rejection handler, or rejected if the handler throws an exception.

	      ```js
	      findUser().then(function (user) {
	        return user.name;
	      }, function (reason) {
	        return 'default name';
	      }).then(function (userName) {
	        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
	        // will be `'default name'`
	      });

	      findUser().then(function (user) {
	        throw new Error('Found user, but still unhappy');
	      }, function (reason) {
	        throw new Error('`findUser` rejected and we're unhappy');
	      }).then(function (value) {
	        // never reached
	      }, function (reason) {
	        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
	        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
	      });
	      ```
	      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

	      ```js
	      findUser().then(function (user) {
	        throw new PedagogicalException('Upstream error');
	      }).then(function (value) {
	        // never reached
	      }).then(function (value) {
	        // never reached
	      }, function (reason) {
	        // The `PedgagocialException` is propagated all the way down to here
	      });
	      ```

	      Assimilation
	      ------------

	      Sometimes the value you want to propagate to a downstream promise can only be
	      retrieved asynchronously. This can be achieved by returning a promise in the
	      fulfillment or rejection handler. The downstream promise will then be pending
	      until the returned promise is settled. This is called *assimilation*.

	      ```js
	      findUser().then(function (user) {
	        return findCommentsByAuthor(user);
	      }).then(function (comments) {
	        // The user's comments are now available
	      });
	      ```

	      If the assimliated promise rejects, then the downstream promise will also reject.

	      ```js
	      findUser().then(function (user) {
	        return findCommentsByAuthor(user);
	      }).then(function (comments) {
	        // If `findCommentsByAuthor` fulfills, we'll have the value here
	      }, function (reason) {
	        // If `findCommentsByAuthor` rejects, we'll have the reason here
	      });
	      ```

	      Simple Example
	      --------------

	      Synchronous Example

	      ```javascript
	      var result;

	      try {
	        result = findResult();
	        // success
	      } catch(reason) {
	        // failure
	      }
	      ```

	      Errback Example

	      ```js
	      findResult(function(result, err){
	        if (err) {
	          // failure
	        } else {
	          // success
	        }
	      });
	      ```

	      Promise Example;

	      ```javascript
	      findResult().then(function(result){
	        // success
	      }, function(reason){
	        // failure
	      });
	      ```

	      Advanced Example
	      --------------

	      Synchronous Example

	      ```javascript
	      var author, books;

	      try {
	        author = findAuthor();
	        books  = findBooksByAuthor(author);
	        // success
	      } catch(reason) {
	        // failure
	      }
	      ```

	      Errback Example

	      ```js

	      function foundBooks(books) {

	      }

	      function failure(reason) {

	      }

	      findAuthor(function(author, err){
	        if (err) {
	          failure(err);
	          // failure
	        } else {
	          try {
	            findBoooksByAuthor(author, function(books, err) {
	              if (err) {
	                failure(err);
	              } else {
	                try {
	                  foundBooks(books);
	                } catch(reason) {
	                  failure(reason);
	                }
	              }
	            });
	          } catch(error) {
	            failure(err);
	          }
	          // success
	        }
	      });
	      ```

	      Promise Example;

	      ```javascript
	      findAuthor().
	        then(findBooksByAuthor).
	        then(function(books){
	          // found books
	      }).catch(function(reason){
	        // something went wrong
	      });
	      ```

	      @method then
	      @param {Function} onFulfilled
	      @param {Function} onRejected
	      Useful for tooling.
	      @return {Promise}
	    */
	      then: lib$es6$promise$then$$default,

	    /**
	      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
	      as the catch block of a try/catch statement.

	      ```js
	      function findAuthor(){
	        throw new Error('couldn't find that author');
	      }

	      // synchronous
	      try {
	        findAuthor();
	      } catch(reason) {
	        // something went wrong
	      }

	      // async with promises
	      findAuthor().catch(function(reason){
	        // something went wrong
	      });
	      ```

	      @method catch
	      @param {Function} onRejection
	      Useful for tooling.
	      @return {Promise}
	    */
	      'catch': function(onRejection) {
	        return this.then(null, onRejection);
	      }
	    };
	    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;
	    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
	      this._instanceConstructor = Constructor;
	      this.promise = new Constructor(lib$es6$promise$$internal$$noop);

	      if (Array.isArray(input)) {
	        this._input     = input;
	        this.length     = input.length;
	        this._remaining = input.length;

	        this._result = new Array(this.length);

	        if (this.length === 0) {
	          lib$es6$promise$$internal$$fulfill(this.promise, this._result);
	        } else {
	          this.length = this.length || 0;
	          this._enumerate();
	          if (this._remaining === 0) {
	            lib$es6$promise$$internal$$fulfill(this.promise, this._result);
	          }
	        }
	      } else {
	        lib$es6$promise$$internal$$reject(this.promise, this._validationError());
	      }
	    }

	    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
	      return new Error('Array Methods must be provided an Array');
	    };

	    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
	      var length  = this.length;
	      var input   = this._input;

	      for (var i = 0; this._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
	        this._eachEntry(input[i], i);
	      }
	    };

	    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
	      var c = this._instanceConstructor;
	      var resolve = c.resolve;

	      if (resolve === lib$es6$promise$promise$resolve$$default) {
	        var then = lib$es6$promise$$internal$$getThen(entry);

	        if (then === lib$es6$promise$then$$default &&
	            entry._state !== lib$es6$promise$$internal$$PENDING) {
	          this._settledAt(entry._state, i, entry._result);
	        } else if (typeof then !== 'function') {
	          this._remaining--;
	          this._result[i] = entry;
	        } else if (c === lib$es6$promise$promise$$default) {
	          var promise = new c(lib$es6$promise$$internal$$noop);
	          lib$es6$promise$$internal$$handleMaybeThenable(promise, entry, then);
	          this._willSettleAt(promise, i);
	        } else {
	          this._willSettleAt(new c(function(resolve) { resolve(entry); }), i);
	        }
	      } else {
	        this._willSettleAt(resolve(entry), i);
	      }
	    };

	    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
	      var promise = this.promise;

	      if (promise._state === lib$es6$promise$$internal$$PENDING) {
	        this._remaining--;

	        if (state === lib$es6$promise$$internal$$REJECTED) {
	          lib$es6$promise$$internal$$reject(promise, value);
	        } else {
	          this._result[i] = value;
	        }
	      }

	      if (this._remaining === 0) {
	        lib$es6$promise$$internal$$fulfill(promise, this._result);
	      }
	    };

	    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
	      var enumerator = this;

	      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
	        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
	      }, function(reason) {
	        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
	      });
	    };
	    function lib$es6$promise$polyfill$$polyfill() {
	      var local;

	      if (typeof global !== 'undefined') {
	          local = global;
	      } else if (typeof self !== 'undefined') {
	          local = self;
	      } else {
	          try {
	              local = Function('return this')();
	          } catch (e) {
	              throw new Error('polyfill failed because global object is unavailable in this environment');
	          }
	      }

	      var P = local.Promise;

	      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
	        return;
	      }

	      local.Promise = lib$es6$promise$promise$$default;
	    }
	    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

	    var lib$es6$promise$umd$$ES6Promise = {
	      'Promise': lib$es6$promise$promise$$default,
	      'polyfill': lib$es6$promise$polyfill$$default
	    };

	    /* global define:true module:true window: true */
	    if ("function" === 'function' && __webpack_require__(87)['amd']) {
	      !(__WEBPACK_AMD_DEFINE_RESULT__ = function() { return lib$es6$promise$umd$$ES6Promise; }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof module !== 'undefined' && module['exports']) {
	      module['exports'] = lib$es6$promise$umd$$ES6Promise;
	    } else if (typeof this !== 'undefined') {
	      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
	    }

	    lib$es6$promise$polyfill$$default();
	}).call(this);


	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(73), (function() { return this; }()), __webpack_require__(85)(module)))

/***/ },
/* 85 */
/***/ function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ },
/* 86 */
/***/ function(module, exports) {

	/* (ignored) */

/***/ },
/* 87 */
/***/ function(module, exports) {

	module.exports = function() { throw new Error("define cannot be used indirect"); };


/***/ },
/* 88 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;

	// built-in messaging interfaces

	/**
	 * pubsub-js messaging interface
	 * @returns {{connect: function, disconnect: function, send: function}}
	 */
	exports['pubsub-js'] = function () {
	  var PubSub = __webpack_require__(89);

	  return {
	    connect: function (params) {
	      var token = PubSub.subscribe(params.id, function (id, message) {
	        params.message(message);
	      });

	      if (typeof params.callback === 'function') {
	        params.callback();
	      }

	      return token;
	    },

	    disconnect: function(token) {
	      PubSub.unsubscribe(token);
	    },

	    send: function (to, message) {
	      PubSub.publish(to, message);
	    }
	  }
	};

	/**
	 * // pubnub messaging interface
	 * @param {{publish_key: string, subscribe_key: string}} params
	 * @returns {{connect: function, disconnect: function, send: function}}
	 */
	exports['pubnub'] = function (params) {
	  var PUBNUB;
	  if (typeof window !== 'undefined') {
	    // browser
	    if (typeof window['PUBNUB'] === 'undefined') {
	      throw new Error('Please load pubnub first in the browser');
	    }
	    PUBNUB = window['PUBNUB'];
	  }
	  else {
	    // node.js
	    PUBNUB = __webpack_require__(90);
	  }

	  var pubnub = PUBNUB.init(params);

	  return {
	    connect: function (params) {
	      pubnub.subscribe({
	        channel: params.id,
	        message: params.message,
	        connect: params.callback
	      });

	      return params.id;
	    },

	    disconnect: function (id) {
	      pubnub.unsubscribe(id);
	    },

	    send: function (to, message) {
	      return new Promise(function (resolve, reject) {
	        pubnub.publish({
	          channel: to,
	          message: message,
	          callback: resolve
	        });
	      })
	    }
	  }
	};

	// default interface
	exports['default'] = exports['pubsub-js'];


/***/ },
/* 89 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*
	Copyright (c) 2010,2011,2012,2013,2014 Morgan Roderick http://roderick.dk
	License: MIT - http://mrgnrdrck.mit-license.org

	https://github.com/mroderick/PubSubJS
	*/
	(function (root, factory){
		'use strict';

	    if (true){
	        // AMD. Register as an anonymous module.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [exports], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

	    } else if (typeof exports === 'object'){
	        // CommonJS
	        factory(exports);

	    }

	    // Browser globals
	    var PubSub = {};
	    root.PubSub = PubSub;
	    factory(PubSub);
	    
	}(( typeof window === 'object' && window ) || this, function (PubSub){
		'use strict';

		var messages = {},
			lastUid = -1;

		function hasKeys(obj){
			var key;

			for (key in obj){
				if ( obj.hasOwnProperty(key) ){
					return true;
				}
			}
			return false;
		}

		/**
		 *	Returns a function that throws the passed exception, for use as argument for setTimeout
		 *	@param { Object } ex An Error object
		 */
		function throwException( ex ){
			return function reThrowException(){
				throw ex;
			};
		}

		function callSubscriberWithDelayedExceptions( subscriber, message, data ){
			try {
				subscriber( message, data );
			} catch( ex ){
				setTimeout( throwException( ex ), 0);
			}
		}

		function callSubscriberWithImmediateExceptions( subscriber, message, data ){
			subscriber( message, data );
		}

		function deliverMessage( originalMessage, matchedMessage, data, immediateExceptions ){
			var subscribers = messages[matchedMessage],
				callSubscriber = immediateExceptions ? callSubscriberWithImmediateExceptions : callSubscriberWithDelayedExceptions,
				s;

			if ( !messages.hasOwnProperty( matchedMessage ) ) {
				return;
			}

			for (s in subscribers){
				if ( subscribers.hasOwnProperty(s)){
					callSubscriber( subscribers[s], originalMessage, data );
				}
			}
		}

		function createDeliveryFunction( message, data, immediateExceptions ){
			return function deliverNamespaced(){
				var topic = String( message ),
					position = topic.lastIndexOf( '.' );

				// deliver the message as it is now
				deliverMessage(message, message, data, immediateExceptions);

				// trim the hierarchy and deliver message to each level
				while( position !== -1 ){
					topic = topic.substr( 0, position );
					position = topic.lastIndexOf('.');
					deliverMessage( message, topic, data, immediateExceptions );
				}
			};
		}

		function messageHasSubscribers( message ){
			var topic = String( message ),
				found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic])),
				position = topic.lastIndexOf( '.' );

			while ( !found && position !== -1 ){
				topic = topic.substr( 0, position );
				position = topic.lastIndexOf( '.' );
				found = Boolean(messages.hasOwnProperty( topic ) && hasKeys(messages[topic]));
			}

			return found;
		}

		function publish( message, data, sync, immediateExceptions ){
			var deliver = createDeliveryFunction( message, data, immediateExceptions ),
				hasSubscribers = messageHasSubscribers( message );

			if ( !hasSubscribers ){
				return false;
			}

			if ( sync === true ){
				deliver();
			} else {
				setTimeout( deliver, 0 );
			}
			return true;
		}

		/**
		 *	PubSub.publish( message[, data] ) -> Boolean
		 *	- message (String): The message to publish
		 *	- data: The data to pass to subscribers
		 *	Publishes the the message, passing the data to it's subscribers
		**/
		PubSub.publish = function( message, data ){
			return publish( message, data, false, PubSub.immediateExceptions );
		};

		/**
		 *	PubSub.publishSync( message[, data] ) -> Boolean
		 *	- message (String): The message to publish
		 *	- data: The data to pass to subscribers
		 *	Publishes the the message synchronously, passing the data to it's subscribers
		**/
		PubSub.publishSync = function( message, data ){
			return publish( message, data, true, PubSub.immediateExceptions );
		};

		/**
		 *	PubSub.subscribe( message, func ) -> String
		 *	- message (String): The message to subscribe to
		 *	- func (Function): The function to call when a new message is published
		 *	Subscribes the passed function to the passed message. Every returned token is unique and should be stored if
		 *	you need to unsubscribe
		**/
		PubSub.subscribe = function( message, func ){
			if ( typeof func !== 'function'){
				return false;
			}

			// message is not registered yet
			if ( !messages.hasOwnProperty( message ) ){
				messages[message] = {};
			}

			// forcing token as String, to allow for future expansions without breaking usage
			// and allow for easy use as key names for the 'messages' object
			var token = 'uid_' + String(++lastUid);
			messages[message][token] = func;

			// return token for unsubscribing
			return token;
		};

		/* Public: Clears all subscriptions
		 */
		PubSub.clearAllSubscriptions = function clearAllSubscriptions(){
			messages = {};
		};

		/*Public: Clear subscriptions by the topic
		*/
		PubSub.clearSubscriptions = function clearSubscriptions(topic){
			var m; 
			for (m in messages){
				if (messages.hasOwnProperty(m) && m.indexOf(topic) === 0){
					delete messages[m];
				}
			}
		};

		/* Public: removes subscriptions.
		 * When passed a token, removes a specific subscription.
		 * When passed a function, removes all subscriptions for that function
		 * When passed a topic, removes all subscriptions for that topic (hierarchy)
		 *
		 * value - A token, function or topic to unsubscribe.
		 *
		 * Examples
		 *
		 *		// Example 1 - unsubscribing with a token
		 *		var token = PubSub.subscribe('mytopic', myFunc);
		 *		PubSub.unsubscribe(token);
		 *
		 *		// Example 2 - unsubscribing with a function
		 *		PubSub.unsubscribe(myFunc);
		 *
		 *		// Example 3 - unsubscribing a topic
		 *		PubSub.unsubscribe('mytopic');
		 */
		PubSub.unsubscribe = function(value){
			var isTopic    = typeof value === 'string' && messages.hasOwnProperty(value),
				isToken    = !isTopic && typeof value === 'string',
				isFunction = typeof value === 'function',
				result = false,
				m, message, t;

			if (isTopic){
				delete messages[value];
				return;
			}

			for ( m in messages ){
				if ( messages.hasOwnProperty( m ) ){
					message = messages[m];

					if ( isToken && message[value] ){
						delete message[value];
						result = value;
						// tokens are unique, so we can just stop here
						break;
					}

					if (isFunction) {
						for ( t in message ){
							if (message.hasOwnProperty(t) && message[t] === value){
								delete message[t];
								result = true;
							}
						}
					}
				}
			}

			return result;
		};
	}));


/***/ },
/* 90 */
/***/ function(module, exports) {

	// Version: 3.9.2 / Modern
	/* ---------------------------------------------------------------------------
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	PubNub Real-time Cloud-Hosted Push API and Push Notification Client Frameworks
	Copyright (c) 2011 PubNub Inc.
	http://www.pubnub.com/
	http://www.pubnub.com/terms
	--------------------------------------------------------------------------- */

	/* ---------------------------------------------------------------------------
	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.
	--------------------------------------------------------------------------- */
	(function(){

	var NOW             = 1
	,   READY           = false
	,   READY_BUFFER    = []
	,   PRESENCE_SUFFIX = '-pnpres'
	,   DEF_WINDOWING   = 10     // MILLISECONDS.
	,   DEF_TIMEOUT     = 15000  // MILLISECONDS.
	,   DEF_SUB_TIMEOUT = 310    // SECONDS.
	,   DEF_KEEPALIVE   = 60     // SECONDS (FOR TIMESYNC).
	,   SECOND          = 1000   // A THOUSAND MILLISECONDS.
	,   URLBIT          = '/'
	,   PARAMSBIT       = '&'
	,   PRESENCE_HB_THRESHOLD = 5
	,   PRESENCE_HB_DEFAULT  = 30
	,   SDK_VER         = "'3.9.2'".replace(/'/g, '') /* TODO: replace version embedding with webpack. */
	,   REPL            = /{([\w\-]+)}/g;

	/**
	 * UTILITIES
	 */
	function unique() { return'x'+ ++NOW+''+(+new Date) }
	function rnow()   { return+new Date }

	/**
	 * NEXTORIGIN
	 * ==========
	 * var next_origin = nextorigin();
	 */
	var nextorigin = (function() {
	    var max = 20
	    ,   ori = Math.floor(Math.random() * max);
	    return function( origin, failover ) {
	        return origin.indexOf('pubsub.') > 0
	            && origin.replace(
	             'pubsub', 'ps' + (
	                failover ? generate_uuid().split('-')[0] :
	                (++ori < max? ori : ori=1)
	            ) ) || origin;
	    }
	})();


	/**
	 * Build Url
	 * =======
	 *
	 */
	function build_url( url_components, url_params ) {
	    var url    = url_components.join(URLBIT)
	    ,   params = [];

	    if (!url_params) return url;

	    each( url_params, function( key, value ) {
	        var value_str = (typeof value == 'object')?JSON['stringify'](value):value;
	        (typeof value != 'undefined' &&
	            value != null && encode(value_str).length > 0
	        ) && params.push(key + "=" + encode(value_str));
	    } );

	    url += "?" + params.join(PARAMSBIT);
	    return url;
	}

	/**
	 * UPDATER
	 * =======
	 * var timestamp = unique();
	 */
	function updater( fun, rate ) {
	    var timeout
	    ,   last   = 0
	    ,   runnit = function() {
	        if (last + rate > rnow()) {
	            clearTimeout(timeout);
	            timeout = setTimeout( runnit, rate );
	        }
	        else {
	            last = rnow();
	            fun();
	        }
	    };

	    return runnit;
	}

	/**
	 * GREP
	 * ====
	 * var list = grep( [1,2,3], function(item) { return item % 2 } )
	 */
	function grep( list, fun ) {
	    var fin = [];
	    each( list || [], function(l) { fun(l) && fin.push(l) } );
	    return fin
	}

	/**
	 * SUPPLANT
	 * ========
	 * var text = supplant( 'Hello {name}!', { name : 'John' } )
	 */
	function supplant( str, values ) {
	    return str.replace( REPL, function( _, match ) {
	        return values[match] || _
	    } );
	}

	/**
	 * timeout
	 * =======
	 * timeout( function(){}, 100 );
	 */
	function timeout( fun, wait ) {
	    return setTimeout( fun, wait );
	}

	/**
	 * uuid
	 * ====
	 * var my_uuid = generate_uuid();
	 */
	function generate_uuid(callback) {
	    var u = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
	    function(c) {
	        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
	        return v.toString(16);
	    });
	    if (callback) callback(u);
	    return u;
	}

	function isArray(arg) {
	  return !!arg && typeof arg !== 'string' && (Array.isArray && Array.isArray(arg) || typeof(arg.length) === "number")
	  //return !!arg && (Array.isArray && Array.isArray(arg) || typeof(arg.length) === "number")
	}

	/**
	 * EACH
	 * ====
	 * each( [1,2,3], function(item) { } )
	 */
	function each( o, f) {
	    if ( !o || !f ) return;

	    if ( isArray(o) )
	        for ( var i = 0, l = o.length; i < l; )
	            f.call( o[i], o[i], i++ );
	    else
	        for ( var i in o )
	            o.hasOwnProperty    &&
	            o.hasOwnProperty(i) &&
	            f.call( o[i], i, o[i] );
	}

	/**
	 * MAP
	 * ===
	 * var list = map( [1,2,3], function(item) { return item + 1 } )
	 */
	function map( list, fun ) {
	    var fin = [];
	    each( list || [], function( k, v ) { fin.push(fun( k, v )) } );
	    return fin;
	}


	function pam_encode(str) {
	  return encodeURIComponent(str).replace(/[!'()*~]/g, function(c) {
	    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
	  });
	}

	/**
	 * ENCODE
	 * ======
	 * var encoded_data = encode('path');
	 */
	function encode(path) { return encodeURIComponent(path) }

	/**
	 * Generate Subscription Channel List
	 * ==================================
	 * generate_channel_list(channels_object);
	 */
	function generate_channel_list(channels, nopresence) {
	    var list = [];
	    each( channels, function( channel, status ) {
	        if (nopresence) {
	            if(channel.search('-pnpres') < 0) {
	                if (status.subscribed) list.push(channel);
	            }
	        } else {
	            if (status.subscribed) list.push(channel);
	        }
	    });
	    return list.sort();
	}

	/**
	 * Generate Subscription Channel Groups List
	 * ==================================
	 * generate_channel_group_list(channels_groups object);
	 */
	function generate_channel_group_list(channel_groups, nopresence) {
	    var list = [];
	    each(channel_groups, function( channel_group, status ) {
	        if (nopresence) {
	            if(channel_group.search('-pnpres') < 0) {
	                if (status.subscribed) list.push(channel_group);
	            }
	        } else {
	            if (status.subscribed) list.push(channel_group);
	        }
	    });
	    return list.sort();
	}

	// PUBNUB READY TO CONNECT
	function ready() { timeout( function() {
	    if (READY) return;
	    READY = 1;
	    each( READY_BUFFER, function(connect) { connect() } );
	}, SECOND ); }

	function PNmessage(args) {
	    msg = args || {'apns' : {}},
	    msg['getPubnubMessage'] = function() {
	        var m = {};

	        if (Object.keys(msg['apns']).length) {
	            m['pn_apns'] = {
	                    'aps' : {
	                        'alert' : msg['apns']['alert'] ,
	                        'badge' : msg['apns']['badge']
	                    }
	            }
	            for (var k in msg['apns']) {
	                m['pn_apns'][k] = msg['apns'][k];
	            }
	            var exclude1 = ['badge','alert'];
	            for (var k in exclude1) {
	                delete m['pn_apns'][exclude1[k]];
	            }
	        }



	        if (msg['gcm']) {
	            m['pn_gcm'] = {
	                'data' : msg['gcm']
	            }
	        }

	        for (var k in msg) {
	            m[k] = msg[k];
	        }
	        var exclude = ['apns','gcm','publish', 'channel','callback','error'];
	        for (var k in exclude) {
	            delete m[exclude[k]];
	        }

	        return m;
	    };
	    msg['publish'] = function() {

	        var m = msg.getPubnubMessage();

	        if (msg['pubnub'] && msg['channel']) {
	            msg['pubnub'].publish({
	                'message' : m,
	                'channel' : msg['channel'],
	                'callback' : msg['callback'],
	                'error' : msg['error']
	            })
	        }
	    };
	    return msg;
	}

	function PN_API(setup) {
	    var SUB_WINDOWING =  +setup['windowing']   || DEF_WINDOWING
	    ,   SUB_TIMEOUT   = (+setup['timeout']     || DEF_SUB_TIMEOUT) * SECOND
	    ,   KEEPALIVE     = (+setup['keepalive']   || DEF_KEEPALIVE)   * SECOND
	    ,   TIME_CHECK    = setup['timecheck']     || 0
	    ,   NOLEAVE       = setup['noleave']       || 0
	    ,   PUBLISH_KEY   = setup['publish_key']
	    ,   SUBSCRIBE_KEY = setup['subscribe_key']
	    ,   AUTH_KEY      = setup['auth_key']      || ''
	    ,   SECRET_KEY    = setup['secret_key']    || ''
	    ,   hmac_SHA256   = setup['hmac_SHA256']
	    ,   SSL           = setup['ssl']            ? 's' : ''
	    ,   ORIGIN        = 'http'+SSL+'://'+(setup['origin']||'pubsub.pubnub.com')
	    ,   STD_ORIGIN    = nextorigin(ORIGIN)
	    ,   SUB_ORIGIN    = nextorigin(ORIGIN)
	    ,   CONNECT       = function(){}
	    ,   PUB_QUEUE     = []
	    ,   CLOAK         = true
	    ,   TIME_DRIFT    = 0
	    ,   SUB_CALLBACK  = 0
	    ,   SUB_CHANNEL   = 0
	    ,   SUB_RECEIVER  = 0
	    ,   SUB_RESTORE   = setup['restore'] || 0
	    ,   SUB_BUFF_WAIT = 0
	    ,   TIMETOKEN     = 0
	    ,   RESUMED       = false
	    ,   CHANNELS      = {}
	    ,   CHANNEL_GROUPS       = {}
	    ,   SUB_ERROR     = function(){}
	    ,   STATE         = {}
	    ,   PRESENCE_HB_TIMEOUT  = null
	    ,   PRESENCE_HB          = validate_presence_heartbeat(
	        setup['heartbeat'] || setup['pnexpires'] || 0, setup['error']
	    )
	    ,   PRESENCE_HB_INTERVAL = setup['heartbeat_interval'] || (PRESENCE_HB / 2) -1
	    ,   PRESENCE_HB_RUNNING  = false
	    ,   NO_WAIT_FOR_PENDING  = setup['no_wait_for_pending']
	    ,   COMPATIBLE_35 = setup['compatible_3.5']  || false
	    ,   xdr           = setup['xdr']
	    ,   params        = setup['params'] || {}
	    ,   error         = setup['error']      || function() {}
	    ,   _is_online    = setup['_is_online'] || function() { return 1 }
	    ,   jsonp_cb      = setup['jsonp_cb']   || function() { return 0 }
	    ,   db            = setup['db']         || {'get': function(){}, 'set': function(){}}
	    ,   CIPHER_KEY    = setup['cipher_key']
	    ,   UUID          = setup['uuid'] || ( !setup['unique_uuid'] && db && db['get'](SUBSCRIBE_KEY+'uuid') || '')
	    ,   USE_INSTANCEID = setup['instance_id'] || false
	    ,   INSTANCEID    = ''
	    ,   shutdown      = setup['shutdown']
	    ,   use_send_beacon = (typeof setup['use_send_beacon'] != 'undefined')?setup['use_send_beacon']:true
	    ,   sendBeacon    = (use_send_beacon)?setup['sendBeacon']:null
	    ,   _poll_timer
	    ,   _poll_timer2;

	    if (PRESENCE_HB === 2) PRESENCE_HB_INTERVAL = 1;

	    var crypto_obj    = setup['crypto_obj'] ||
	        {
	            'encrypt' : function(a,key){ return a},
	            'decrypt' : function(b,key){return b}
	        };

	    function _get_url_params(data) {
	        if (!data) data = {};
	        each( params , function( key, value ) {
	            if (!(key in data)) data[key] = value;
	        });
	        return data;
	    }

	    function _object_to_key_list(o) {
	        var l = []
	        each( o , function( key, value ) {
	            l.push(key);
	        });
	        return l;
	    }
	    function _object_to_key_list_sorted(o) {
	        return _object_to_key_list(o).sort();
	    }

	    function _get_pam_sign_input_from_params(params) {
	        var si = "";
	        var l = _object_to_key_list_sorted(params);

	        for (var i in l) {
	            var k = l[i]
	            si += k + "=" + pam_encode(params[k]) ;
	            if (i != l.length - 1) si += "&"
	        }
	        return si;
	    }

	    function validate_presence_heartbeat(heartbeat, cur_heartbeat, error) {
	        var err = false;

	        if (typeof heartbeat === 'undefined') {
	            return cur_heartbeat;
	        }

	        if (typeof heartbeat === 'number') {
	            if (heartbeat > PRESENCE_HB_THRESHOLD || heartbeat == 0)
	                err = false;
	            else
	                err = true;
	        } else if(typeof heartbeat === 'boolean'){
	            if (!heartbeat) {
	                return 0;
	            } else {
	                return PRESENCE_HB_DEFAULT;
	            }
	        } else {
	            err = true;
	        }

	        if (err) {
	            error && error("Presence Heartbeat value invalid. Valid range ( x > " + PRESENCE_HB_THRESHOLD + " or x = 0). Current Value : " + (cur_heartbeat || PRESENCE_HB_THRESHOLD));
	            return cur_heartbeat || PRESENCE_HB_THRESHOLD;
	        } else return heartbeat;
	    }

	    function encrypt(input, key) {
	        return crypto_obj['encrypt'](input, key || CIPHER_KEY) || input;
	    }
	    function decrypt(input, key) {
	        return crypto_obj['decrypt'](input, key || CIPHER_KEY) ||
	               crypto_obj['decrypt'](input, CIPHER_KEY) ||
	               input;
	    }

	    function error_common(message, callback) {
	        callback && callback({ 'error' : message || "error occurred"});
	        error && error(message);
	    }
	    function _presence_heartbeat() {

	        clearTimeout(PRESENCE_HB_TIMEOUT);

	        if (!PRESENCE_HB_INTERVAL || PRESENCE_HB_INTERVAL >= 500 ||
	            PRESENCE_HB_INTERVAL < 1 ||
	            (!generate_channel_list(CHANNELS,true).length  && !generate_channel_group_list(CHANNEL_GROUPS, true).length ) )
	        {
	            PRESENCE_HB_RUNNING = false;
	            return;
	        }

	        PRESENCE_HB_RUNNING = true;
	        SELF['presence_heartbeat']({
	            'callback' : function(r) {
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            },
	            'error' : function(e) {
	                error && error("Presence Heartbeat unable to reach Pubnub servers." + JSON.stringify(e));
	                PRESENCE_HB_TIMEOUT = timeout( _presence_heartbeat, (PRESENCE_HB_INTERVAL) * SECOND );
	            }
	        });
	    }

	    function start_presence_heartbeat() {
	        !PRESENCE_HB_RUNNING && _presence_heartbeat();
	    }

	    function publish(next) {

	        if (NO_WAIT_FOR_PENDING) {
	            if (!PUB_QUEUE.length) return;
	        } else {
	            if (next) PUB_QUEUE.sending = 0;
	            if ( PUB_QUEUE.sending || !PUB_QUEUE.length ) return;
	            PUB_QUEUE.sending = 1;
	        }

	        xdr(PUB_QUEUE.shift());
	    }
	    function each_channel_group(callback) {
	        var count = 0;

	        each( generate_channel_group_list(CHANNEL_GROUPS), function(channel_group) {
	            var chang = CHANNEL_GROUPS[channel_group];

	            if (!chang) return;

	            count++;
	            (callback||function(){})(chang);
	        } );

	        return count;
	    }

	    function each_channel(callback) {
	        var count = 0;

	        each( generate_channel_list(CHANNELS), function(channel) {
	            var chan = CHANNELS[channel];

	            if (!chan) return;

	            count++;
	            (callback||function(){})(chan);
	        } );

	        return count;
	    }
	    function _invoke_callback(response, callback, err) {
	        if (typeof response == 'object') {
	            if (response['error']) {
	                var callback_data = {};

	                if (response['message']) {
	                    callback_data['message'] = response['message'];
	                }

	                if (response['payload']) {
	                    callback_data['payload'] = response['payload'];
	                }

	                err && err(callback_data);
	                return;

	            }
	            if (response['payload']) {
	                if (response['next_page'])
	                    callback && callback(response['payload'], response['next_page']);
	                else
	                    callback && callback(response['payload']);
	                return;
	            }
	        }
	        callback && callback(response);
	    }

	    function _invoke_error(response,err) {

	        if (typeof response == 'object' && response['error']) {
	                var callback_data = {};

	                if (response['message']) {
	                    callback_data['message'] = response['message'];
	                }

	                if (response['payload']) {
	                    callback_data['payload'] = response['payload'];
	                }
	                
	                err && err(callback_data);
	                return;
	        } else {
	            err && err(response);
	        }
	    }
	    function CR(args, callback, url1, data) {
	            var callback        = args['callback']      || callback
	            ,   err             = args['error']         || error
	            ,   jsonp           = jsonp_cb();

	            data = data || {};
	            
	            if (!data['auth']) {
	                data['auth'] = args['auth_key'] || AUTH_KEY;
	            }
	            
	            var url = [
	                    STD_ORIGIN, 'v1', 'channel-registration',
	                    'sub-key', SUBSCRIBE_KEY
	                ];

	            url.push.apply(url,url1);
	            
	            if (jsonp) data['callback']              = jsonp;
	            
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });

	    }

	    // Announce Leave Event
	    var SELF = {
	        'LEAVE' : function( channel, blocking, auth_key, callback, error ) {
	            var data   = { 'uuid' : UUID, 'auth' : auth_key || AUTH_KEY }
	            ,   origin = nextorigin(ORIGIN)
	            ,   callback = callback || function(){}
	            ,   err      = error    || function(){}
	            ,   url
	            ,   params
	            ,   jsonp  = jsonp_cb();

	            // Prevent Leaving a Presence Channel
	            if (channel.indexOf(PRESENCE_SUFFIX) > 0) return true;


	            if (COMPATIBLE_35) {
	                if (!SSL)         return false;
	                if (jsonp == '0') return false;
	            }

	            if (NOLEAVE)  return false;

	            if (jsonp != '0') data['callback'] = jsonp;

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            url = [
	                    origin, 'v2', 'presence', 'sub_key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel), 'leave'
	                ];

	            params = _get_url_params(data);


	            if (sendBeacon) {
	                url_string = build_url(url, params);
	                if (sendBeacon(url_string)) {
	                    callback && callback({"status": 200, "action": "leave", "message": "OK", "service": "Presence"});
	                    return true;
	                }
	            }


	            xdr({
	                blocking : blocking || SSL,
	                callback : jsonp,
	                data     : params,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });
	            return true;
	        },
	        'LEAVE_GROUP' : function( channel_group, blocking, auth_key, callback, error ) {

	            var data   = { 'uuid' : UUID, 'auth' : auth_key || AUTH_KEY }
	            ,   origin = nextorigin(ORIGIN)
	            ,   url
	            ,   params
	            ,   callback = callback || function(){}
	            ,   err      = error    || function(){}
	            ,   jsonp  = jsonp_cb();

	            // Prevent Leaving a Presence Channel Group
	            if (channel_group.indexOf(PRESENCE_SUFFIX) > 0) return true;

	            if (COMPATIBLE_35) {
	                if (!SSL)         return false;
	                if (jsonp == '0') return false;
	            }

	            if (NOLEAVE)  return false;

	            if (jsonp != '0') data['callback'] = jsonp;

	            if (channel_group && channel_group.length > 0) data['channel-group'] = channel_group;

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            url = [
	                    origin, 'v2', 'presence', 'sub_key',
	                    SUBSCRIBE_KEY, 'channel', encode(','), 'leave'
	            ];

	            params = _get_url_params(data);

	            if (sendBeacon) {
	                url_string = build_url(url, params);
	                if (sendBeacon(url_string)) {
	                    callback && callback({"status": 200, "action": "leave", "message": "OK", "service": "Presence"});
	                    return true;
	                }
	            }

	            xdr({
	                blocking : blocking || SSL,
	                callback : jsonp,
	                data     : params,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });
	            return true;
	        },
	        'set_resumed' : function(resumed) {
	                RESUMED = resumed;
	        },
	        'get_cipher_key' : function() {
	            return CIPHER_KEY;
	        },
	        'set_cipher_key' : function(key) {
	            CIPHER_KEY = key;
	        },
	        'raw_encrypt' : function(input, key) {
	            return encrypt(input, key);
	        },
	        'raw_decrypt' : function(input, key) {
	            return decrypt(input, key);
	        },
	        'get_heartbeat' : function() {
	            return PRESENCE_HB;
	        },
	        
	        'set_heartbeat' : function(heartbeat, heartbeat_interval) {
	            PRESENCE_HB = validate_presence_heartbeat(heartbeat, PRESENCE_HB, error);
	            PRESENCE_HB_INTERVAL = heartbeat_interval || (PRESENCE_HB / 2) - 1;
	            if (PRESENCE_HB == 2) {
	                PRESENCE_HB_INTERVAL = 1;
	            }
	            CONNECT();
	            _presence_heartbeat();
	        },
	        
	        'get_heartbeat_interval' : function() {
	            return PRESENCE_HB_INTERVAL;
	        },
	        
	        'set_heartbeat_interval' : function(heartbeat_interval) {
	            PRESENCE_HB_INTERVAL = heartbeat_interval;
	            _presence_heartbeat();
	        },
	        
	        'get_version' : function() {
	            return SDK_VER;
	        },
	        'getGcmMessageObject' : function(obj) {
	            return {
	                'data' : obj
	            }
	        },
	        'getApnsMessageObject' : function(obj) {
	            var x =  {
	                'aps' : { 'badge' : 1, 'alert' : ''}
	            }
	            for (k in obj) {
	                k[x] = obj[k];
	            }
	            return x;
	        },
	        'newPnMessage' : function() {
	            var x = {};
	            if (gcm) x['pn_gcm'] = gcm;
	            if (apns) x['pn_apns'] = apns;
	            for ( k in n ) {
	                x[k] = n[k];
	            }
	            return x;
	        },

	        '_add_param' : function(key,val) {
	            params[key] = val;
	        },

	        'channel_group' : function(args, callback) {
	            var ns_ch       = args['channel_group']
	            ,   callback    = callback         || args['callback']
	            ,   channels    = args['channels'] || args['channel']
	            ,   cloak       = args['cloak']
	            ,   namespace
	            ,   channel_group
	            ,   url = []
	            ,   data = {}
	            ,   mode = args['mode'] || 'add';


	            if (ns_ch) {
	                var ns_ch_a = ns_ch.split(':');

	                if (ns_ch_a.length > 1) {
	                    namespace = (ns_ch_a[0] === '*')?null:ns_ch_a[0];

	                    channel_group = ns_ch_a[1];
	                } else {
	                    channel_group = ns_ch_a[0];
	                }
	            }

	            namespace && url.push('namespace') && url.push(encode(namespace));

	            url.push('channel-group');

	            if (channel_group && channel_group !== '*') {
	                url.push(channel_group);
	            }

	            if (channels ) {
	                if (isArray(channels)) {
	                    channels = channels.join(',');
	                }
	                data[mode] = channels;
	                data['cloak'] = (CLOAK)?'true':'false';
	            } else {
	                if (mode === 'remove') url.push('remove');
	            }

	            if (typeof cloak != 'undefined') data['cloak'] = (cloak)?'true':'false';

	            CR(args, callback, url, data);
	        },

	        'channel_group_list_groups' : function(args, callback) {
	            var namespace;

	            namespace = args['namespace'] || args['ns'] || args['channel_group'] || null;
	            if (namespace) {
	                args["channel_group"] = namespace + ":*";
	            }

	            SELF['channel_group'](args, callback);
	        },

	        'channel_group_list_channels' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            SELF['channel_group'](args, callback);
	        },

	        'channel_group_remove_channel' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            if (!args['channel'] && !args['channels'] ) return error('Missing Channel');

	            args['mode'] = 'remove';
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_remove_group' : function(args, callback) {
	            if (!args['channel_group']) return error('Missing Channel Group');
	            if (args['channel']) return error('Use channel_group_remove_channel if you want to remove a channel from a group.');

	            args['mode'] = 'remove';
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_add_channel' : function(args, callback) {
	           if (!args['channel_group']) return error('Missing Channel Group');
	           if (!args['channel'] && !args['channels'] ) return error('Missing Channel');
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_cloak' : function(args, callback) {
	            if (typeof args['cloak'] == 'undefined') {
	                callback(CLOAK);
	                return;
	            }
	            CLOAK = args['cloak'];
	            SELF['channel_group'](args,callback);
	        },

	        'channel_group_list_namespaces' : function(args, callback) {
	            var url = ['namespace'];
	            CR(args, callback, url);
	        },
	        'channel_group_remove_namespace' : function(args, callback) {
	            var url = ['namespace',args['namespace'],'remove'];
	            CR(args, callback, url);
	        },

	        /*
	            PUBNUB.history({
	                channel  : 'my_chat_channel',
	                limit    : 100,
	                callback : function(history) { }
	            });
	        */
	        'history' : function( args, callback ) {
	            var callback         = args['callback'] || callback
	            ,   count            = args['count']    || args['limit'] || 100
	            ,   reverse          = args['reverse']  || "false"
	            ,   err              = args['error']    || function(){}
	            ,   auth_key         = args['auth_key'] || AUTH_KEY
	            ,   cipher_key       = args['cipher_key']
	            ,   channel          = args['channel']
	            ,   channel_group    = args['channel_group']
	            ,   start            = args['start']
	            ,   end              = args['end']
	            ,   include_token    = args['include_token']
	            ,   string_msg_token = args['string_message_token'] || false
	            ,   params           = {}
	            ,   jsonp            = jsonp_cb();

	            // Make sure we have a Channel
	            if (!channel && !channel_group) return error('Missing Channel');
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            params['stringtoken'] = 'true';
	            params['count']       = count;
	            params['reverse']     = reverse;
	            params['auth']        = auth_key;

	            if (channel_group) {
	                params['channel-group'] = channel_group;
	                if (!channel) {
	                    channel = ','; 
	                }
	            }
	            if (jsonp) params['callback']              = jsonp;
	            if (start) params['start']                 = start;
	            if (end)   params['end']                   = end;
	            if (include_token) params['include_token'] = 'true';
	            if (string_msg_token) params['string_message_token'] = 'true';

	            // Send Message
	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(params),
	                success  : function(response) {
	                    if (typeof response == 'object' && response['error']) {
	                        err({'message' : response['message'], 'payload' : response['payload']});
	                        return;
	                    }
	                    var messages = response[0];
	                    var decrypted_messages = [];
	                    for (var a = 0; a < messages.length; a++) {
	                        if (include_token) {
	                            var new_message = decrypt(messages[a]['message'],cipher_key);
	                            var timetoken = messages[a]['timetoken'];
	                            try {
	                                decrypted_messages['push']({"message" : JSON['parse'](new_message), "timetoken" : timetoken});
	                            } catch (e) {
	                                decrypted_messages['push'](({"message" : new_message, "timetoken" : timetoken}));
	                            }
	                        } else {
	                            var new_message = decrypt(messages[a],cipher_key);
	                            try {
	                                decrypted_messages['push'](JSON['parse'](new_message));
	                            } catch (e) {
	                                decrypted_messages['push']((new_message));
	                            }     
	                        }
	                    }
	                    callback([decrypted_messages, response[1], response[2]]);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'history', 'sub-key',
	                    SUBSCRIBE_KEY, 'channel', encode(channel)
	                ]
	            });
	        },

	        /*
	            PUBNUB.replay({
	                source      : 'my_channel',
	                destination : 'new_channel'
	            });
	        */
	        'replay' : function(args, callback) {
	            var callback    = callback || args['callback'] || function(){}
	            ,   auth_key    = args['auth_key'] || AUTH_KEY
	            ,   source      = args['source']
	            ,   destination = args['destination']
	            ,   stop        = args['stop']
	            ,   start       = args['start']
	            ,   end         = args['end']
	            ,   reverse     = args['reverse']
	            ,   limit       = args['limit']
	            ,   jsonp       = jsonp_cb()
	            ,   data        = {}
	            ,   url;

	            // Check User Input
	            if (!source)        return error('Missing Source Channel');
	            if (!destination)   return error('Missing Destination Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            // Setup URL Params
	            if (jsonp != '0') data['callback'] = jsonp;
	            if (stop)         data['stop']     = 'all';
	            if (reverse)      data['reverse']  = 'true';
	            if (start)        data['start']    = start;
	            if (end)          data['end']      = end;
	            if (limit)        data['count']    = limit;

	            data['auth'] = auth_key;

	            // Compose URL Parts
	            url = [
	                STD_ORIGIN, 'v1', 'replay',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                source, destination
	            ];

	            // Start (or Stop) Replay!
	            xdr({
	                callback : jsonp,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function() { callback([ 0, 'Disconnected' ]) },
	                url      : url,
	                data     : _get_url_params(data)
	            });
	        },

	        /*
	            PUBNUB.auth('AJFLKAJSDKLA');
	        */
	        'auth' : function(auth) {
	            AUTH_KEY = auth;
	            CONNECT();
	        },

	        /*
	            PUBNUB.time(function(time){ });
	        */
	        'time' : function(callback) {
	            var jsonp = jsonp_cb();

	            var data = { 'uuid' : UUID, 'auth' : AUTH_KEY }

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                url      : [STD_ORIGIN, 'time', jsonp],
	                success  : function(response) { callback(response[0]) },
	                fail     : function() { callback(0) }
	            });
	        },

	        /*
	            PUBNUB.publish({
	                channel : 'my_chat_channel',
	                message : 'hello!'
	            });
	        */
	        'publish' : function( args, callback ) {
	            var msg      = args['message'];
	            if (!msg) return error('Missing Message');

	            var callback = callback || args['callback'] || msg['callback'] || args['success'] || function(){}
	            ,   channel  = args['channel'] || msg['channel']
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   cipher_key = args['cipher_key']
	            ,   err      = args['error'] || msg['error'] || function() {}
	            ,   post     = args['post'] || false
	            ,   store    = ('store_in_history' in args) ? args['store_in_history']: true
	            ,   jsonp    = jsonp_cb()
	            ,   add_msg  = 'push'
	            ,   params
	            ,   url;

	            if (args['prepend']) add_msg = 'unshift'

	            if (!channel)       return error('Missing Channel');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (msg['getPubnubMessage']) {
	                msg = msg['getPubnubMessage']();
	            }

	            // If trying to send Object
	            msg = JSON['stringify'](encrypt(msg, cipher_key));

	            // Create URL
	            url = [
	                STD_ORIGIN, 'publish',
	                PUBLISH_KEY, SUBSCRIBE_KEY,
	                0, encode(channel),
	                jsonp, encode(msg)
	            ];

	            params = { 'uuid' : UUID, 'auth' : auth_key }

	            if (!store) params['store'] ="0"

	            if (USE_INSTANCEID) params['instanceid'] = INSTANCEID;

	            // Queue Message Send
	            PUB_QUEUE[add_msg]({
	                callback : jsonp,
	                url      : url,
	                data     : _get_url_params(params),
	                fail     : function(response){
	                    _invoke_error(response, err);
	                    publish(1);
	                },
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                    publish(1);
	                },
	                mode     : (post)?'POST':'GET'
	            });

	            // Send Message
	            publish();
	        },

	        /*
	            PUBNUB.unsubscribe({ channel : 'my_chat' });
	        */
	        'unsubscribe' : function(args, callback) {
	            var channelArg = args['channel'];
	            var channelGroupArg = args['channel_group'];
	            var auth_key = args['auth_key'] || AUTH_KEY;
	            var callback = callback || args['callback'] || function(){};
	            var err = args['error'] || function(){};

	            TIMETOKEN   = 0;
	            SUB_RESTORE = 1;   // REVISIT !!!!

	            if (!channelArg && !channelGroupArg) return error('Missing Channel or Channel Group');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (channelArg) {
	                var channels = isArray(channelArg) ? channelArg : ('' + channelArg).split(",");
	                var existingChannels = [];
	                var presenceChannels = [];

	                each(channels, function(channel){
	                    if (CHANNELS[channel]) existingChannels.push(channel);
	                });

	                // if we do not have any channels to unsubscribe from, trigger a callback.
	                if (existingChannels.length == 0){
	                    callback({action : "leave"});
	                    return;
	                }

	                // Prepare presence channels
	                each(existingChannels, function(channel) {
	                    presenceChannels.push(channel + PRESENCE_SUFFIX);
	                });

	                each(existingChannels.concat(presenceChannels), function(channel){
	                    if (channel in CHANNELS) CHANNELS[channel] = 0;
	                    if (channel in STATE) delete STATE[channel];
	                });

	                var CB_CALLED = true;
	                if (READY) {
	                    CB_CALLED = SELF['LEAVE'](existingChannels.join(','), 0 , auth_key, callback, err);
	                }
	                if (!CB_CALLED) callback({action : "leave"});
	            }

	            if (channelGroupArg) {
	                var channelGroups = isArray(channelGroupArg) ? channelGroupArg : ('' + channelGroupArg).split(",");
	                var existingChannelGroups = [];
	                var presenceChannelGroups = [];

	                each(channelGroups, function(channelGroup){
	                    if (CHANNEL_GROUPS[channelGroup]) existingChannelGroups.push(channelGroup);
	                });

	                // if we do not have any channel groups to unsubscribe from, trigger a callback.
	                if (existingChannelGroups.length == 0){
	                    callback({action : "leave"});
	                    return;
	                }

	                // Prepare presence channels
	                each(existingChannelGroups, function(channelGroup) {
	                    presenceChannelGroups.push(channelGroup + PRESENCE_SUFFIX);
	                });

	                each(existingChannelGroups.concat(presenceChannelGroups), function(channelGroup){
	                    if (channelGroup in CHANNEL_GROUPS) CHANNEL_GROUPS[channelGroup] = 0;
	                    if (channelGroup in STATE) delete STATE[channelGroup];
	                });

	                var CB_CALLED = true;
	                if (READY) {
	                    CB_CALLED = SELF['LEAVE_GROUP'](existingChannelGroups.join(','), 0 , auth_key, callback, err);
	                }
	                if (!CB_CALLED) callback({action : "leave"});
	            }

	            // Reset Connection if Count Less
	            CONNECT();
	        },

	        /*
	            PUBNUB.subscribe({
	                channel  : 'my_chat'
	                callback : function(message) { }
	            });
	        */
	        'subscribe' : function( args, callback ) {
	            var channel         = args['channel']
	            ,   channel_group   = args['channel_group']
	            ,   callback        = callback            || args['callback']
	            ,   callback        = callback            || args['message']
	            ,   connect         = args['connect']     || function(){}
	            ,   reconnect       = args['reconnect']   || function(){}
	            ,   disconnect      = args['disconnect']  || function(){}
	            ,   SUB_ERROR       = args['error']       || SUB_ERROR || function(){}
	            ,   idlecb          = args['idle']        || function(){}
	            ,   presence        = args['presence']    || 0
	            ,   noheresync      = args['noheresync']  || 0
	            ,   backfill        = args['backfill']    || 0
	            ,   timetoken       = args['timetoken']   || 0
	            ,   sub_timeout     = args['timeout']     || SUB_TIMEOUT
	            ,   windowing       = args['windowing']   || SUB_WINDOWING
	            ,   state           = args['state']
	            ,   heartbeat       = args['heartbeat'] || args['pnexpires']
	            ,   heartbeat_interval = args['heartbeat_interval']
	            ,   restore         = args['restore'] || SUB_RESTORE;

	            AUTH_KEY            = args['auth_key']    || AUTH_KEY;

	            // Restore Enabled?
	            SUB_RESTORE = restore;

	            // Always Reset the TT
	            TIMETOKEN = timetoken;

	            // Make sure we have a Channel
	            if (!channel && !channel_group) {
	                return error('Missing Channel');
	            }

	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (heartbeat || heartbeat === 0 || heartbeat_interval || heartbeat_interval === 0) {
	                SELF['set_heartbeat'](heartbeat, heartbeat_interval);
	            }

	            // Setup Channel(s)
	            if (channel) {
	                each( (channel.join ? channel.join(',') : ''+channel).split(','),
	                function(channel) {
	                    var settings = CHANNELS[channel] || {};

	                    // Store Channel State
	                    CHANNELS[SUB_CHANNEL = channel] = {
	                        name         : channel,
	                        connected    : settings.connected,
	                        disconnected : settings.disconnected,
	                        subscribed   : 1,
	                        callback     : SUB_CALLBACK = callback,
	                        'cipher_key' : args['cipher_key'],
	                        connect      : connect,
	                        disconnect   : disconnect,
	                        reconnect    : reconnect
	                    };

	                    if (state) {
	                        if (channel in state) {
	                            STATE[channel] = state[channel];
	                        } else {
	                            STATE[channel] = state;
	                        }
	                    }

	                    // Presence Enabled?
	                    if (!presence) return;

	                    // Subscribe Presence Channel
	                    SELF['subscribe']({
	                        'channel'  : channel + PRESENCE_SUFFIX,
	                        'callback' : presence,
	                        'restore'  : restore
	                    });

	                    // Presence Subscribed?
	                    if (settings.subscribed) return;

	                    // See Who's Here Now?
	                    if (noheresync) return;
	                    SELF['here_now']({
	                        'channel'  : channel,
	                        'data'     : _get_url_params({ 'uuid' : UUID, 'auth' : AUTH_KEY }),
	                        'callback' : function(here) {
	                            each( 'uuids' in here ? here['uuids'] : [],
	                            function(uid) { presence( {
	                                'action'    : 'join',
	                                'uuid'      : uid,
	                                'timestamp' : Math.floor(rnow() / 1000),
	                                'occupancy' : here['occupancy'] || 1
	                            }, here, channel ); } );
	                        }
	                    });
	                } );
	            }

	            // Setup Channel Groups
	            if (channel_group) {
	                each( (channel_group.join ? channel_group.join(',') : ''+channel_group).split(','),
	                function(channel_group) {
	                    var settings = CHANNEL_GROUPS[channel_group] || {};

	                    CHANNEL_GROUPS[channel_group] = {
	                        name         : channel_group,
	                        connected    : settings.connected,
	                        disconnected : settings.disconnected,
	                        subscribed   : 1,
	                        callback     : SUB_CALLBACK = callback,
	                        'cipher_key' : args['cipher_key'],
	                        connect      : connect,
	                        disconnect   : disconnect,
	                        reconnect    : reconnect
	                    };

	                    // Presence Enabled?
	                    if (!presence) return;

	                    // Subscribe Presence Channel
	                    SELF['subscribe']({
	                        'channel_group'  : channel_group + PRESENCE_SUFFIX,
	                        'callback' : presence,
	                        'restore'  : restore,
	                        'auth_key' : AUTH_KEY
	                    });

	                    // Presence Subscribed?
	                    if (settings.subscribed) return;

	                    // See Who's Here Now?
	                    if (noheresync) return;
	                    SELF['here_now']({
	                        'channel_group'  : channel_group,
	                        'data'           : _get_url_params({ 'uuid' : UUID, 'auth' : AUTH_KEY }),
	                        'callback' : function(here) {
	                            each( 'uuids' in here ? here['uuids'] : [],
	                            function(uid) { presence( {
	                                'action'    : 'join',
	                                'uuid'      : uid,
	                                'timestamp' : Math.floor(rnow() / 1000),
	                                'occupancy' : here['occupancy'] || 1
	                            }, here, channel_group ); } );
	                        }
	                    });
	                } );
	            }


	            // Test Network Connection
	            function _test_connection(success) {
	                if (success) {
	                    // Begin Next Socket Connection
	                    timeout( CONNECT, windowing);
	                }
	                else {
	                    // New Origin on Failed Connection
	                    STD_ORIGIN = nextorigin( ORIGIN, 1 );
	                    SUB_ORIGIN = nextorigin( ORIGIN, 1 );

	                    // Re-test Connection
	                    timeout( function() {
	                        SELF['time'](_test_connection);
	                    }, SECOND );
	                }

	                // Disconnect & Reconnect
	                each_channel(function(channel){
	                    // Reconnect
	                    if (success && channel.disconnected) {
	                        channel.disconnected = 0;
	                        return channel.reconnect(channel.name);
	                    }

	                    // Disconnect
	                    if (!success && !channel.disconnected) {
	                        channel.disconnected = 1;
	                        channel.disconnect(channel.name);
	                    }
	                });
	                
	                // Disconnect & Reconnect for channel groups
	                each_channel_group(function(channel_group){
	                    // Reconnect
	                    if (success && channel_group.disconnected) {
	                        channel_group.disconnected = 0;
	                        return channel_group.reconnect(channel_group.name);
	                    }

	                    // Disconnect
	                    if (!success && !channel_group.disconnected) {
	                        channel_group.disconnected = 1;
	                        channel_group.disconnect(channel_group.name);
	                    }
	                });
	            }

	            // Evented Subscribe
	            function _connect() {
	                var jsonp           = jsonp_cb()
	                ,   channels        = generate_channel_list(CHANNELS).join(',')
	                ,   channel_groups  = generate_channel_group_list(CHANNEL_GROUPS).join(',');

	                // Stop Connection
	                if (!channels && !channel_groups) return;

	                if (!channels) channels = ',';

	                // Connect to PubNub Subscribe Servers
	                _reset_offline();

	                var data = _get_url_params({ 'uuid' : UUID, 'auth' : AUTH_KEY });

	                if (channel_groups) {
	                    data['channel-group'] = channel_groups;
	                }


	                var st = JSON.stringify(STATE);
	                if (st.length > 2) data['state'] = JSON.stringify(STATE);

	                if (PRESENCE_HB) data['heartbeat'] = PRESENCE_HB;

	                if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	                start_presence_heartbeat();
	                SUB_RECEIVER = xdr({
	                    timeout  : sub_timeout,
	                    callback : jsonp,
	                    fail     : function(response) {
	                        if (response && response['error'] && response['service']) {
	                            _invoke_error(response, SUB_ERROR);
	                            _test_connection(1);
	                        } else {
	                            SELF['time'](function(success){
	                                !success && ( _invoke_error(response, SUB_ERROR));
	                                _test_connection(success);
	                            });
	                        }
	                    },
	                    data     : _get_url_params(data),
	                    url      : [
	                        SUB_ORIGIN, 'subscribe',
	                        SUBSCRIBE_KEY, encode(channels),
	                        jsonp, TIMETOKEN
	                    ],
	                    success : function(messages) {

	                        // Check for Errors
	                        if (!messages || (
	                            typeof messages == 'object' &&
	                            'error' in messages         &&
	                            messages['error']
	                        )) {
	                            SUB_ERROR(messages['error']);
	                            return timeout( CONNECT, SECOND );
	                        }

	                        // User Idle Callback
	                        idlecb(messages[1]);

	                        // Restore Previous Connection Point if Needed
	                        TIMETOKEN = !TIMETOKEN               &&
	                                    SUB_RESTORE              &&
	                                    db['get'](SUBSCRIBE_KEY) || messages[1];

	                        /*
	                        // Connect
	                        each_channel_registry(function(registry){
	                            if (registry.connected) return;
	                            registry.connected = 1;
	                            registry.connect(channel.name);
	                        });
	                        */

	                        // Connect
	                        each_channel(function(channel){
	                            if (channel.connected) return;
	                            channel.connected = 1;
	                            channel.connect(channel.name);
	                        });

	                        // Connect for channel groups
	                        each_channel_group(function(channel_group){
	                            if (channel_group.connected) return;
	                            channel_group.connected = 1;
	                            channel_group.connect(channel_group.name);
	                        });

	                        if (RESUMED && !SUB_RESTORE) {
	                                TIMETOKEN = 0;
	                                RESUMED = false;
	                                // Update Saved Timetoken
	                                db['set']( SUBSCRIBE_KEY, 0 );
	                                timeout( _connect, windowing );
	                                return;
	                        }

	                        // Invoke Memory Catchup and Receive Up to 100
	                        // Previous Messages from the Queue.
	                        if (backfill) {
	                            TIMETOKEN = 10000;
	                            backfill  = 0;
	                        }

	                        // Update Saved Timetoken
	                        db['set']( SUBSCRIBE_KEY, messages[1] );

	                        // Route Channel <---> Callback for Message
	                        var next_callback = (function() {
	                            var channels = '';
	                            var channels2 = '';

	                            if (messages.length > 3) {
	                                channels  = messages[3];
	                                channels2 = messages[2];
	                            } else if (messages.length > 2) {
	                                channels = messages[2];
	                            } else {
	                                channels =  map(
	                                    generate_channel_list(CHANNELS), function(chan) { return map(
	                                        Array(messages[0].length)
	                                        .join(',').split(','),
	                                        function() { return chan; }
	                                    ) }).join(',')
	                            }

	                            var list  = channels.split(',');
	                            var list2 = (channels2)?channels2.split(','):[];

	                            return function() {
	                                var channel  = list.shift()||SUB_CHANNEL;
	                                var channel2 = list2.shift();

	                                var chobj = {};

	                                if (channel2) {
	                                    if (channel && channel.indexOf('-pnpres') >= 0 
	                                        && channel2.indexOf('-pnpres') < 0) {
	                                        channel2 += '-pnpres';
	                                    }
	                                    chobj = CHANNEL_GROUPS[channel2] || CHANNELS[channel2] || {'callback' : function(){}};
	                                } else {
	                                    chobj = CHANNELS[channel];
	                                }

	                                var r = [
	                                    chobj
	                                    .callback||SUB_CALLBACK,
	                                    channel.split(PRESENCE_SUFFIX)[0]
	                                ];
	                                channel2 && r.push(channel2.split(PRESENCE_SUFFIX)[0]);
	                                return r;
	                            };
	                        })();

	                        var latency = detect_latency(+messages[1]);
	                        each( messages[0], function(msg) {
	                            var next = next_callback();
	                            var decrypted_msg = decrypt(msg,
	                                (CHANNELS[next[1]])?CHANNELS[next[1]]['cipher_key']:null);
	                            next[0] && next[0]( decrypted_msg, messages, next[2] || next[1], latency, next[1]);
	                        });

	                        timeout( _connect, windowing );
	                    }
	                });
	            }

	            CONNECT = function() {
	                _reset_offline();
	                timeout( _connect, windowing );
	            };

	            // Reduce Status Flicker
	            if (!READY) return READY_BUFFER.push(CONNECT);

	            // Connect Now
	            CONNECT();
	        },

	        /*
	            PUBNUB.here_now({ channel : 'my_chat', callback : fun });
	        */
	        'here_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   debug    = args['debug']
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   channel  = args['channel']
	            ,   channel_group = args['channel_group']
	            ,   jsonp    = jsonp_cb()
	            ,   uuids    = ('uuids' in args) ? args['uuids'] : true
	            ,   state    = args['state']
	            ,   data     = { 'uuid' : UUID, 'auth' : auth_key };

	            if (!uuids) data['disable_uuids'] = 1;
	            if (state) data['state'] = 1;

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            var url = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY
	                ];

	            channel && url.push('channel') && url.push(encode(channel));

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (channel_group) {
	                data['channel-group'] = channel_group;
	                !channel && url.push('channel') && url.push(','); 
	            }

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                debug    : debug,
	                url      : url
	            });
	        },

	        /*
	            PUBNUB.current_channels_by_uuid({ channel : 'my_chat', callback : fun });
	        */
	        'where_now' : function( args, callback ) {
	            var callback = args['callback'] || callback
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   uuid     = args['uuid']     || UUID
	            ,   data     = { 'auth' : auth_key };

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub_key', SUBSCRIBE_KEY,
	                    'uuid', encode(uuid)
	                ]
	            });
	        },

	        'state' : function(args, callback) {
	            var callback = args['callback'] || callback || function(r) {}
	            ,   err      = args['error']    || function(){}
	            ,   auth_key = args['auth_key'] || AUTH_KEY
	            ,   jsonp    = jsonp_cb()
	            ,   state    = args['state']
	            ,   uuid     = args['uuid'] || UUID
	            ,   channel  = args['channel']
	            ,   channel_group = args['channel_group']
	            ,   url
	            ,   data     = _get_url_params({ 'auth' : auth_key });

	            // Make sure we have a Channel
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!uuid) return error('Missing UUID');
	            if (!channel && !channel_group) return error('Missing Channel');

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            if (typeof channel != 'undefined'
	                && CHANNELS[channel] && CHANNELS[channel].subscribed ) {
	                if (state) STATE[channel] = state;
	            }

	            if (typeof channel_group != 'undefined'
	                && CHANNEL_GROUPS[channel_group]
	                && CHANNEL_GROUPS[channel_group].subscribed
	                ) {
	                if (state) STATE[channel_group] = state;
	                data['channel-group'] = channel_group;

	                if (!channel) {
	                    channel = ',';
	                }
	            }

	            data['state'] = JSON.stringify(state);

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            if (state) {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', channel,
	                    'uuid', uuid, 'data'
	                ]
	            } else {
	                url      = [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel', channel,
	                    'uuid', encode(uuid)
	                ]
	            }

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url

	            });

	        },

	        /*
	            PUBNUB.grant({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                ttl      : 24 * 60, // Minutes
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'grant' : function( args, callback ) {
	            var callback        = args['callback'] || callback
	            ,   err             = args['error']    || function(){}
	            ,   channel         = args['channel']  || args['channels']
	            ,   channel_group   = args['channel_group']
	            ,   jsonp           = jsonp_cb()
	            ,   ttl             = args['ttl']
	            ,   r               = (args['read'] )?"1":"0"
	            ,   w               = (args['write'])?"1":"0"
	            ,   m               = (args['manage'])?"1":"0"
	            ,   auth_key        = args['auth_key'] || args['auth_keys'];

	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n" + PUBLISH_KEY + "\n"
	                    + "grant" + "\n";

	            var data = {
	                'w'         : w,
	                'r'         : r,
	                'timestamp' : timestamp
	            };
	            if (args['manage']) {
	                data['m'] = m;
	            }
	            if (isArray(channel)) {
	                channel = channel['join'](',');
	            }
	            if (isArray(auth_key)) {
	                auth_key = auth_key['join'](',');
	            }
	            if (typeof channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (typeof channel_group != 'undefined' && channel_group != null && channel_group.length > 0) {
	                data['channel-group'] = channel_group;
	            }
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (ttl || ttl === 0) data['ttl'] = ttl;

	            if (auth_key) data['auth'] = auth_key;

	            data = _get_url_params(data)

	            if (!auth_key) delete data['auth'];

	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;

	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'grant' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	         PUBNUB.mobile_gw_provision ({
	         device_id: 'A655FBA9931AB',
	         op       : 'add' | 'remove',
	         gw_type  : 'apns' | 'gcm',
	         channel  : 'my_chat',
	         callback : fun,
	         error    : fun,
	         });
	         */

	        'mobile_gw_provision' : function( args ) {

	            var callback = args['callback'] || function(){}
	                ,   auth_key       = args['auth_key'] || AUTH_KEY
	                ,   err            = args['error'] || function() {}
	                ,   jsonp          = jsonp_cb()
	                ,   channel        = args['channel']
	                ,   op             = args['op']
	                ,   gw_type        = args['gw_type']
	                ,   device_id      = args['device_id']
	                ,   params
	                ,   url;

	            if (!device_id)     return error('Missing Device ID (device_id)');
	            if (!gw_type)       return error('Missing GW Type (gw_type: gcm or apns)');
	            if (!op)            return error('Missing GW Operation (op: add or remove)');
	            if (!channel)       return error('Missing gw destination Channel (channel)');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');

	            // Create URL
	            url = [
	                STD_ORIGIN, 'v1/push/sub-key',
	                SUBSCRIBE_KEY, 'devices', device_id
	            ];

	            params = { 'uuid' : UUID, 'auth' : auth_key, 'type': gw_type};

	            if (op == "add") {
	                params['add'] = channel;
	            } else if (op == "remove") {
	                params['remove'] = channel;
	            }

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            xdr({
	                callback : jsonp,
	                data     : params,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : url
	            });

	        },

	        /*
	            PUBNUB.audit({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                read     : true,
	                write    : true,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'audit' : function( args, callback ) {
	            var callback        = args['callback'] || callback
	            ,   err             = args['error']    || function(){}
	            ,   channel         = args['channel']
	            ,   channel_group   = args['channel_group']
	            ,   auth_key        = args['auth_key']
	            ,   jsonp           = jsonp_cb();

	            // Make sure we have a Channel
	            if (!callback)      return error('Missing Callback');
	            if (!SUBSCRIBE_KEY) return error('Missing Subscribe Key');
	            if (!PUBLISH_KEY)   return error('Missing Publish Key');
	            if (!SECRET_KEY)    return error('Missing Secret Key');

	            var timestamp  = Math.floor(new Date().getTime() / 1000)
	            ,   sign_input = SUBSCRIBE_KEY + "\n"
	                + PUBLISH_KEY + "\n"
	                + "audit" + "\n";

	            var data = {'timestamp' : timestamp };
	            if (jsonp != '0') { data['callback'] = jsonp; }
	            if (typeof channel != 'undefined' && channel != null && channel.length > 0) data['channel'] = channel;
	            if (typeof channel_group != 'undefined' && channel_group != null && channel_group.length > 0) {
	                data['channel-group'] = channel_group;
	            }
	            if (auth_key) data['auth']    = auth_key;

	            data = _get_url_params(data);

	            if (!auth_key) delete data['auth'];

	            sign_input += _get_pam_sign_input_from_params(data);

	            var signature = hmac_SHA256( sign_input, SECRET_KEY );

	            signature = signature.replace( /\+/g, "-" );
	            signature = signature.replace( /\//g, "_" );

	            data['signature'] = signature;
	            xdr({
	                callback : jsonp,
	                data     : data,
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) {
	                    _invoke_error(response, err);
	                },
	                url      : [
	                    STD_ORIGIN, 'v1', 'auth', 'audit' ,
	                    'sub-key', SUBSCRIBE_KEY
	                ]
	            });
	        },

	        /*
	            PUBNUB.revoke({
	                channel  : 'my_chat',
	                callback : fun,
	                error    : fun,
	                auth_key : '3y8uiajdklytowsj'
	            });
	        */
	        'revoke' : function( args, callback ) {
	            args['read']  = false;
	            args['write'] = false;
	            SELF['grant']( args, callback );
	        },
	        'set_uuid' : function(uuid) {
	            UUID = uuid;
	            CONNECT();
	        },
	        'get_uuid' : function() {
	            return UUID;
	        },
	        'isArray'  : function(arg) {
	            return isArray(arg);
	        },
	        'get_subscribed_channels' : function() {
	            return generate_channel_list(CHANNELS, true);
	        },
	        'presence_heartbeat' : function(args) {
	            var callback = args['callback'] || function() {}
	            var err      = args['error']    || function() {}
	            var jsonp    = jsonp_cb();
	            var data     = { 'uuid' : UUID, 'auth' : AUTH_KEY };

	            var st = JSON['stringify'](STATE);
	            if (st.length > 2) data['state'] = JSON['stringify'](STATE);

	            if (PRESENCE_HB > 0 && PRESENCE_HB < 320) data['heartbeat'] = PRESENCE_HB;

	            if (jsonp != '0') { data['callback'] = jsonp; }

	            var channels        = encode(generate_channel_list(CHANNELS, true)['join'](','));
	            var channel_groups  = generate_channel_group_list(CHANNEL_GROUPS, true)['join'](',');

	            if (!channels) channels = ',';
	            if (channel_groups) data['channel-group'] = channel_groups;

	            if (USE_INSTANCEID) data['instanceid'] = INSTANCEID;

	            xdr({
	                callback : jsonp,
	                data     : _get_url_params(data),
	                url      : [
	                    STD_ORIGIN, 'v2', 'presence',
	                    'sub-key', SUBSCRIBE_KEY,
	                    'channel' , channels,
	                    'heartbeat'
	                ],
	                success  : function(response) {
	                    _invoke_callback(response, callback, err);
	                },
	                fail     : function(response) { _invoke_error(response, err); }
	            });
	        },
	        'stop_timers': function () {
	            clearTimeout(_poll_timer);
	            clearTimeout(_poll_timer2);
	            clearTimeout(PRESENCE_HB_TIMEOUT);
	        },
	        'shutdown': function () {
	            SELF['stop_timers']();
	            shutdown && shutdown();
	        },

	        // Expose PUBNUB Functions
	        'xdr'           : xdr,
	        'ready'         : ready,
	        'db'            : db,
	        'uuid'          : generate_uuid,
	        'map'           : map,
	        'each'          : each,
	        'each-channel'  : each_channel,
	        'grep'          : grep,
	        'offline'       : function(){ _reset_offline(
	            1, { "message" : "Offline. Please check your network settings." })
	        },
	        'supplant'      : supplant,
	        'now'           : rnow,
	        'unique'        : unique,
	        'updater'       : updater
	    };

	    function _poll_online() {
	        _is_online() || _reset_offline( 1, {
	            "error" : "Offline. Please check your network settings. "
	        });
	        _poll_timer && clearTimeout(_poll_timer);
	        _poll_timer = timeout( _poll_online, SECOND );
	    }

	    function _poll_online2() {
	        if (!TIME_CHECK) return;
	        SELF['time'](function(success){
	            detect_time_detla( function(){}, success );
	            success || _reset_offline( 1, {
	                "error" : "Heartbeat failed to connect to Pubnub Servers." +
	                    "Please check your network settings."
	                });
	            _poll_timer2 && clearTimeout(_poll_timer2);
	            _poll_timer2 = timeout( _poll_online2, KEEPALIVE );
	        });
	    }

	    function _reset_offline(err, msg) {
	        SUB_RECEIVER && SUB_RECEIVER(err, msg);
	        SUB_RECEIVER = null;

	        clearTimeout(_poll_timer);
	        clearTimeout(_poll_timer2);
	    }
	    
	    if (!UUID) UUID = SELF['uuid']();
	    if (!INSTANCEID) INSTANCEID = SELF['uuid']();
	    db['set']( SUBSCRIBE_KEY + 'uuid', UUID );

	    _poll_timer  = timeout( _poll_online,  SECOND    );
	    _poll_timer2 = timeout( _poll_online2, KEEPALIVE );
	    PRESENCE_HB_TIMEOUT = timeout(
	        start_presence_heartbeat,
	        ( PRESENCE_HB_INTERVAL - 3 ) * SECOND
	    );

	    // Detect Age of Message
	    function detect_latency(tt) {
	        var adjusted_time = rnow() - TIME_DRIFT;
	        return adjusted_time - tt / 10000;
	    }

	    detect_time_detla();
	    function detect_time_detla( cb, time ) {
	        var stime = rnow();

	        time && calculate(time) || SELF['time'](calculate);

	        function calculate(time) {
	            if (!time) return;
	            var ptime   = time / 10000
	            ,   latency = (rnow() - stime) / 2;
	            TIME_DRIFT = rnow() - (ptime + latency);
	            cb && cb(TIME_DRIFT);
	        }
	    }

	    return SELF;
	}


	// expose a closure to server oriented applications.
	if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
	    module.exports = {
	        'PN_API': PN_API,
	        'unique': unique,
	        'PNmessage': PNmessage,
	        'DEF_TIMEOUT': DEF_TIMEOUT,
	        'timeout': timeout,
	        'build_url': build_url,
	        'each': each,
	        'uuid': generate_uuid,
	        'URLBIT': URLBIT
	    };
	}


	function crypto_obj() {

	    function SHA256(s) {
	        return CryptoJS['SHA256'](s)['toString'](CryptoJS['enc']['Hex']);
	    }

	    var iv = "0123456789012345";

	    var allowedKeyEncodings = ['hex', 'utf8', 'base64', 'binary'];
	    var allowedKeyLengths = [128, 256];
	    var allowedModes = ['ecb', 'cbc'];

	    var defaultOptions = {
	        'encryptKey': true,
	        'keyEncoding': 'utf8',
	        'keyLength': 256,
	        'mode': 'cbc'
	    };

	    function parse_options(options) {

	        // Defaults
	        options = options || {};
	        if (!options['hasOwnProperty']('encryptKey')) options['encryptKey'] = defaultOptions['encryptKey'];
	        if (!options['hasOwnProperty']('keyEncoding')) options['keyEncoding'] = defaultOptions['keyEncoding'];
	        if (!options['hasOwnProperty']('keyLength')) options['keyLength'] = defaultOptions['keyLength'];
	        if (!options['hasOwnProperty']('mode')) options['mode'] = defaultOptions['mode'];

	        // Validation
	        if (allowedKeyEncodings['indexOf'](options['keyEncoding']['toLowerCase']()) == -1) options['keyEncoding'] = defaultOptions['keyEncoding'];
	        if (allowedKeyLengths['indexOf'](parseInt(options['keyLength'], 10)) == -1) options['keyLength'] = defaultOptions['keyLength'];
	        if (allowedModes['indexOf'](options['mode']['toLowerCase']()) == -1) options['mode'] = defaultOptions['mode'];

	        return options;

	    }

	    function decode_key(key, options) {
	        if (options['keyEncoding'] == 'base64') {
	            return CryptoJS['enc']['Base64']['parse'](key);
	        } else if (options['keyEncoding'] == 'hex') {
	            return CryptoJS['enc']['Hex']['parse'](key);
	        } else {
	            return key;
	        }
	    }

	    function get_padded_key(key, options) {
	        key = decode_key(key, options);
	        if (options['encryptKey']) {
	            return CryptoJS['enc']['Utf8']['parse'](SHA256(key)['slice'](0, 32));
	        } else {
	            return key;
	        }
	    }

	    function get_mode(options) {
	        if (options['mode'] == 'ecb') {
	            return CryptoJS['mode']['ECB'];
	        } else {
	            return CryptoJS['mode']['CBC'];
	        }
	    }

	    function get_iv(options) {
	        return (options['mode'] == 'cbc') ? CryptoJS['enc']['Utf8']['parse'](iv) : null;
	    }

	    return {

	        'encrypt': function(data, key, options) {
	            if (!key) return data;
	            options = parse_options(options);
	            var iv = get_iv(options);
	            var mode = get_mode(options);
	            var cipher_key = get_padded_key(key, options);
	            var hex_message = JSON['stringify'](data);
	            var encryptedHexArray = CryptoJS['AES']['encrypt'](hex_message, cipher_key, {'iv': iv, 'mode': mode})['ciphertext'];
	            var base_64_encrypted = encryptedHexArray['toString'](CryptoJS['enc']['Base64']);
	            return base_64_encrypted || data;
	        },

	        'decrypt': function(data, key, options) {
	            if (!key) return data;
	            options = parse_options(options);
	            var iv = get_iv(options);
	            var mode = get_mode(options);
	            var cipher_key = get_padded_key(key, options);
	            try {
	                var binary_enc = CryptoJS['enc']['Base64']['parse'](data);
	                var json_plain = CryptoJS['AES']['decrypt']({'ciphertext': binary_enc}, cipher_key, {'iv': iv, 'mode': mode})['toString'](CryptoJS['enc']['Utf8']);
	                var plaintext = JSON['parse'](json_plain);
	                return plaintext;
	            }
	            catch (e) {
	                return undefined;
	            }
	        }
	    };
	}

	/**
	 * UTIL LOCALS
	 */
	var NOW        = 1
	,    PNSDK      = 'PubNub-JS-' + 'Modern' + '/' + '3.9.2';



	/**
	 * LOCAL STORAGE
	 */
	var db = (function(){
	    var ls = typeof localStorage != 'undefined' && localStorage;
	    return {
	        get : function(key) {
	            try {
	                if (ls) return ls.getItem(key);
	                if (document.cookie.indexOf(key) == -1) return null;
	                return ((document.cookie||'').match(
	                    RegExp(key+'=([^;]+)')
	                )||[])[1] || null;
	            } catch(e) { return }
	        },
	        set : function( key, value ) {
	            try {
	                if (ls) return ls.setItem( key, value ) && 0;
	                document.cookie = key + '=' + value +
	                    '; expires=Thu, 1 Aug 2030 20:00:00 UTC; path=/';
	            } catch(e) { return }
	        }
	    };
	})();


	/**
	 * CORS XHR Request
	 * ================
	 *  xdr({
	 *     url     : ['http://www.blah.com/url'],
	 *     success : function(response) {},
	 *     fail    : function() {}
	 *  });
	 */
	function xdr( setup ) {
	    var xhr
	    ,   finished = function() {
	            if (loaded) return;
	                loaded = 1;

	            clearTimeout(timer);

	            try       { response = JSON['parse'](xhr.responseText); }
	            catch (r) { return done(1); }

	            success(response);
	        }
	    ,   complete = 0
	    ,   loaded   = 0
	    ,   xhrtme   = setup.timeout || DEF_TIMEOUT
	    ,   timer    = timeout( function(){done(1)}, xhrtme )
	    ,   data     = setup.data || {}
	    ,   fail     = setup.fail    || function(){}
	    ,   success  = setup.success || function(){}
	    ,   async    = true /* do not allow sync operations in modern builds */
	    ,   done     = function(failed, response) {
	            if (complete) return;
	                complete = 1;

	            clearTimeout(timer);

	            if (xhr) {
	                xhr.onerror = xhr.onload = null;
	                xhr.abort && xhr.abort();
	                xhr = null;
	            }

	            failed && fail(response);
	        };

	    // Send
	    try {
	        xhr = typeof XDomainRequest !== 'undefined' &&
	              new XDomainRequest()  ||
	              new XMLHttpRequest();

	        xhr.onerror = xhr.onabort   = function(){ done(1, xhr.responseText || { "error" : "Network Connection Error"}) };
	        xhr.onload  = xhr.onloadend = finished;
	        xhr.onreadystatechange = function() {
	            if (xhr && xhr.readyState == 4) {
	                switch(xhr.status) {
	                    case 200:
	                        break;
	                    default:
	                        try {
	                            response = JSON['parse'](xhr.responseText);
	                            done(1,response);
	                        }
	                        catch (r) { return done(1, {status : xhr.status, payload : null, message : xhr.responseText}); }
	                        return;
	                }
	            }
	        }
	        data['pnsdk'] = PNSDK;
	        url = build_url(setup.url, data);
	        xhr.open( 'GET', url, async);
	        if (async) xhr.timeout = xhrtme;
	        xhr.send();
	    }
	    catch(eee) {
	        done(0);
	        return xdr(setup);
	    }

	    // Return 'done'
	    return done;
	}

	/**
	 * BIND
	 * ====
	 * bind( 'keydown', search('a')[0], function(element) {
	 *     ...
	 * } );
	 */
	function bind( type, el, fun ) {
	    each( type.split(','), function(etype) {
	        var rapfun = function(e) {
	            if (!e) e = window.event;
	            if (!fun(e)) {
	                e.cancelBubble = true;
	                e.returnValue  = false;
	                e.preventDefault && e.preventDefault();
	                e.stopPropagation && e.stopPropagation();
	            }
	        };

	        if ( el.addEventListener ) el.addEventListener( etype, rapfun, false );
	        else if ( el.attachEvent ) el.attachEvent( 'on' + etype, rapfun );
	        else  el[ 'on' + etype ] = rapfun;
	    } );
	}

	/**
	 * UNBIND
	 * ======
	 * unbind( 'keydown', search('a')[0] );
	 */
	function unbind( type, el, fun ) {
	    if ( el.removeEventListener ) el.removeEventListener( type, false );
	    else if ( el.detachEvent ) el.detachEvent( 'on' + type, false );
	    else  el[ 'on' + type ] = null;
	}

	/**
	 * ERROR
	 * ===
	 * error('message');
	 */
	function error(message) { console['error'](message) }

	/**
	 * EVENTS
	 * ======
	 * PUBNUB.events.bind( 'you-stepped-on-flower', function(message) {
	 *     // Do Stuff with message
	 * } );
	 *
	 * PUBNUB.events.fire( 'you-stepped-on-flower', "message-data" );
	 * PUBNUB.events.fire( 'you-stepped-on-flower', {message:"data"} );
	 * PUBNUB.events.fire( 'you-stepped-on-flower', [1,2,3] );
	 *
	 */
	var events = {
	    'list'   : {},
	    'unbind' : function( name ) { events.list[name] = [] },
	    'bind'   : function( name, fun ) {
	        (events.list[name] = events.list[name] || []).push(fun);
	    },
	    'fire' : function( name, data ) {
	        each(
	            events.list[name] || [],
	            function(fun) { fun(data) }
	        );
	    }
	};

	/**
	 * ATTR
	 * ====
	 * var attribute = attr( node, 'attribute' );
	 */
	function attr( node, attribute, value ) {
	    if (value) node.setAttribute( attribute, value );
	    else return node && node.getAttribute && node.getAttribute(attribute);
	}

	/**
	 * $
	 * =
	 * var div = $('divid');
	 */
	function $(id) { return document.getElementById(id) }


	/**
	 * SEARCH
	 * ======
	 * var elements = search('a div span');
	 */
	function search( elements, start ) {
	    var list = [];
	    each( elements.split(/\s+/), function(el) {
	        each( (start || document).getElementsByTagName(el), function(node) {
	            list.push(node);
	        } );
	    } );
	    return list;
	}

	/**
	 * CSS
	 * ===
	 * var obj = create('div');
	 */
	function css( element, styles ) {
	    for (var style in styles) if (styles.hasOwnProperty(style))
	        try {element.style[style] = styles[style] + (
	            '|width|height|top|left|'.indexOf(style) > 0 &&
	            typeof styles[style] == 'number'
	            ? 'px' : ''
	        )}catch(e){}
	}

	/**
	 * CREATE
	 * ======
	 * var obj = create('div');
	 */
	function create(element) { return document.createElement(element) }


	function get_hmac_SHA256(data,key) {
	    var hash = CryptoJS['HmacSHA256'](data, key);
	    return hash.toString(CryptoJS['enc']['Base64']);
	}

	/* =-====================================================================-= */
	/* =-====================================================================-= */
	/* =-=========================     PUBNUB     ===========================-= */
	/* =-====================================================================-= */
	/* =-====================================================================-= */

	function CREATE_PUBNUB(setup) {


	    setup['db'] = db;
	    setup['xdr'] = xdr;
	    setup['error'] = setup['error'] || error;
	    setup['hmac_SHA256']= get_hmac_SHA256;
	    setup['crypto_obj'] = crypto_obj();
	    setup['params']      = { 'pnsdk' : PNSDK }

	    SELF = function(setup) {
	        return CREATE_PUBNUB(setup);
	    }
	    var PN = PN_API(setup);
	    for (var prop in PN) {
	        if (PN.hasOwnProperty(prop)) {
	            SELF[prop] = PN[prop];
	        }
	    }

	    SELF['init'] = SELF;
	    SELF['$'] = $;
	    SELF['attr'] = attr;
	    SELF['search'] = search;
	    SELF['bind'] = bind;
	    SELF['css'] = css;
	    SELF['create'] = create;
	    SELF['crypto_obj'] = crypto_obj();

	    if (typeof(window) !== 'undefined'){
	        bind( 'beforeunload', window, function() {
	            SELF['each-channel'](function(ch){ SELF['LEAVE']( ch.name, 1 ) });
	            return true;
	        });
	    }

	    // Return without Testing
	    if (setup['notest']) return SELF;

	    if (typeof(window) !== 'undefined'){
	        bind( 'offline', window,   SELF['offline'] );
	    }

	    if (typeof(document) !== 'undefined'){
	        bind( 'offline', document, SELF['offline'] );
	    }

	    SELF['ready']();
	    return SELF;
	}
	CREATE_PUBNUB['init'] = CREATE_PUBNUB
	CREATE_PUBNUB['secure'] = CREATE_PUBNUB
	CREATE_PUBNUB['crypto_obj'] = crypto_obj()
	PUBNUB = CREATE_PUBNUB({})
	typeof module  !== 'undefined' && (module.exports = CREATE_PUBNUB) ||
	typeof exports !== 'undefined' && (exports.PUBNUB = CREATE_PUBNUB) || (PUBNUB = CREATE_PUBNUB);

	})();
	(function(){

	// ---------------------------------------------------------------------------
	// WEBSOCKET INTERFACE
	// ---------------------------------------------------------------------------
	var WS = PUBNUB['ws'] = function( url, protocols ) {
	    if (!(this instanceof WS)) return new WS( url, protocols );

	    var self     = this
	    ,   url      = self.url      = url || ''
	    ,   protocol = self.protocol = protocols || 'Sec-WebSocket-Protocol'
	    ,   bits     = url.split('/')
	    ,   setup    = {
	         'ssl'           : bits[0] === 'wss:'
	        ,'origin'        : bits[2]
	        ,'publish_key'   : bits[3]
	        ,'subscribe_key' : bits[4]
	        ,'channel'       : bits[5]
	    };

	    // READY STATES
	    self['CONNECTING'] = 0; // The connection is not yet open.
	    self['OPEN']       = 1; // The connection is open and ready to communicate.
	    self['CLOSING']    = 2; // The connection is in the process of closing.
	    self['CLOSED']     = 3; // The connection is closed or couldn't be opened.

	    // CLOSE STATES
	    self['CLOSE_NORMAL']         = 1000; // Normal Intended Close; completed.
	    self['CLOSE_GOING_AWAY']     = 1001; // Closed Unexpecttedly.
	    self['CLOSE_PROTOCOL_ERROR'] = 1002; // Server: Not Supported.
	    self['CLOSE_UNSUPPORTED']    = 1003; // Server: Unsupported Protocol.
	    self['CLOSE_TOO_LARGE']      = 1004; // Server: Too Much Data.
	    self['CLOSE_NO_STATUS']      = 1005; // Server: No reason.
	    self['CLOSE_ABNORMAL']       = 1006; // Abnormal Disconnect.

	    // Events Default
	    self['onclose']   = self['onerror'] =
	    self['onmessage'] = self['onopen']  =
	    self['onsend']    =  function(){};

	    // Attributes
	    self['binaryType']     = '';
	    self['extensions']     = '';
	    self['bufferedAmount'] = 0;
	    self['trasnmitting']   = false;
	    self['buffer']         = [];
	    self['readyState']     = self['CONNECTING'];

	    // Close if no setup.
	    if (!url) {
	        self['readyState'] = self['CLOSED'];
	        self['onclose']({
	            'code'     : self['CLOSE_ABNORMAL'],
	            'reason'   : 'Missing URL',
	            'wasClean' : true
	        });
	        return self;
	    }

	    // PubNub WebSocket Emulation
	    self.pubnub       = PUBNUB['init'](setup);
	    self.pubnub.setup = setup;
	    self.setup        = setup;

	    self.pubnub['subscribe']({
	        'restore'    : false,
	        'channel'    : setup['channel'],
	        'disconnect' : self['onerror'],
	        'reconnect'  : self['onopen'],
	        'error'      : function() {
	            self['onclose']({
	                'code'     : self['CLOSE_ABNORMAL'],
	                'reason'   : 'Missing URL',
	                'wasClean' : false
	            });
	        },
	        'callback'   : function(message) {
	            self['onmessage']({ 'data' : message });
	        },
	        'connect'    : function() {
	            self['readyState'] = self['OPEN'];
	            self['onopen']();
	        }
	    });
	};

	// ---------------------------------------------------------------------------
	// WEBSOCKET SEND
	// ---------------------------------------------------------------------------
	WS.prototype.send = function(data) {
	    var self = this;
	    self.pubnub['publish']({
	        'channel'  : self.pubnub.setup['channel'],
	        'message'  : data,
	        'callback' : function(response) {
	            self['onsend']({ 'data' : response });
	        }
	    });
	};

	// ---------------------------------------------------------------------------
	// WEBSOCKET CLOSE
	// ---------------------------------------------------------------------------
	WS.prototype.close = function() {
	    var self = this;
	    self.pubnub['unsubscribe']({ 'channel' : self.pubnub.setup['channel'] });
	    self['readyState'] = self['CLOSED'];
	    self['onclose']({});
	};

	})();
	/*
	CryptoJS v3.1.2
	code.google.com/p/crypto-js
	(c) 2009-2013 by Jeff Mott. All rights reserved.
	code.google.com/p/crypto-js/wiki/License
	*/
	var CryptoJS=CryptoJS||function(h,s){var f={},g=f.lib={},q=function(){},m=g.Base={extend:function(a){q.prototype=this;var c=new q;a&&c.mixIn(a);c.hasOwnProperty("init")||(c.init=function(){c.$super.init.apply(this,arguments)});c.init.prototype=c;c.$super=this;return c},create:function(){var a=this.extend();a.init.apply(a,arguments);return a},init:function(){},mixIn:function(a){for(var c in a)a.hasOwnProperty(c)&&(this[c]=a[c]);a.hasOwnProperty("toString")&&(this.toString=a.toString)},clone:function(){return this.init.prototype.extend(this)}},
	r=g.WordArray=m.extend({init:function(a,c){a=this.words=a||[];this.sigBytes=c!=s?c:4*a.length},toString:function(a){return(a||k).stringify(this)},concat:function(a){var c=this.words,d=a.words,b=this.sigBytes;a=a.sigBytes;this.clamp();if(b%4)for(var e=0;e<a;e++)c[b+e>>>2]|=(d[e>>>2]>>>24-8*(e%4)&255)<<24-8*((b+e)%4);else if(65535<d.length)for(e=0;e<a;e+=4)c[b+e>>>2]=d[e>>>2];else c.push.apply(c,d);this.sigBytes+=a;return this},clamp:function(){var a=this.words,c=this.sigBytes;a[c>>>2]&=4294967295<<
	32-8*(c%4);a.length=h.ceil(c/4)},clone:function(){var a=m.clone.call(this);a.words=this.words.slice(0);return a},random:function(a){for(var c=[],d=0;d<a;d+=4)c.push(4294967296*h.random()|0);return new r.init(c,a)}}),l=f.enc={},k=l.Hex={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++){var e=c[b>>>2]>>>24-8*(b%4)&255;d.push((e>>>4).toString(16));d.push((e&15).toString(16))}return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b+=2)d[b>>>3]|=parseInt(a.substr(b,
	2),16)<<24-4*(b%8);return new r.init(d,c/2)}},n=l.Latin1={stringify:function(a){var c=a.words;a=a.sigBytes;for(var d=[],b=0;b<a;b++)d.push(String.fromCharCode(c[b>>>2]>>>24-8*(b%4)&255));return d.join("")},parse:function(a){for(var c=a.length,d=[],b=0;b<c;b++)d[b>>>2]|=(a.charCodeAt(b)&255)<<24-8*(b%4);return new r.init(d,c)}},j=l.Utf8={stringify:function(a){try{return decodeURIComponent(escape(n.stringify(a)))}catch(c){throw Error("Malformed UTF-8 data");}},parse:function(a){return n.parse(unescape(encodeURIComponent(a)))}},
	u=g.BufferedBlockAlgorithm=m.extend({reset:function(){this._data=new r.init;this._nDataBytes=0},_append:function(a){"string"==typeof a&&(a=j.parse(a));this._data.concat(a);this._nDataBytes+=a.sigBytes},_process:function(a){var c=this._data,d=c.words,b=c.sigBytes,e=this.blockSize,f=b/(4*e),f=a?h.ceil(f):h.max((f|0)-this._minBufferSize,0);a=f*e;b=h.min(4*a,b);if(a){for(var g=0;g<a;g+=e)this._doProcessBlock(d,g);g=d.splice(0,a);c.sigBytes-=b}return new r.init(g,b)},clone:function(){var a=m.clone.call(this);
	a._data=this._data.clone();return a},_minBufferSize:0});g.Hasher=u.extend({cfg:m.extend(),init:function(a){this.cfg=this.cfg.extend(a);this.reset()},reset:function(){u.reset.call(this);this._doReset()},update:function(a){this._append(a);this._process();return this},finalize:function(a){a&&this._append(a);return this._doFinalize()},blockSize:16,_createHelper:function(a){return function(c,d){return(new a.init(d)).finalize(c)}},_createHmacHelper:function(a){return function(c,d){return(new t.HMAC.init(a,
	d)).finalize(c)}}});var t=f.algo={};return f}(Math);

	// SHA256
	(function(h){for(var s=CryptoJS,f=s.lib,g=f.WordArray,q=f.Hasher,f=s.algo,m=[],r=[],l=function(a){return 4294967296*(a-(a|0))|0},k=2,n=0;64>n;){var j;a:{j=k;for(var u=h.sqrt(j),t=2;t<=u;t++)if(!(j%t)){j=!1;break a}j=!0}j&&(8>n&&(m[n]=l(h.pow(k,0.5))),r[n]=l(h.pow(k,1/3)),n++);k++}var a=[],f=f.SHA256=q.extend({_doReset:function(){this._hash=new g.init(m.slice(0))},_doProcessBlock:function(c,d){for(var b=this._hash.words,e=b[0],f=b[1],g=b[2],j=b[3],h=b[4],m=b[5],n=b[6],q=b[7],p=0;64>p;p++){if(16>p)a[p]=
	c[d+p]|0;else{var k=a[p-15],l=a[p-2];a[p]=((k<<25|k>>>7)^(k<<14|k>>>18)^k>>>3)+a[p-7]+((l<<15|l>>>17)^(l<<13|l>>>19)^l>>>10)+a[p-16]}k=q+((h<<26|h>>>6)^(h<<21|h>>>11)^(h<<7|h>>>25))+(h&m^~h&n)+r[p]+a[p];l=((e<<30|e>>>2)^(e<<19|e>>>13)^(e<<10|e>>>22))+(e&f^e&g^f&g);q=n;n=m;m=h;h=j+k|0;j=g;g=f;f=e;e=k+l|0}b[0]=b[0]+e|0;b[1]=b[1]+f|0;b[2]=b[2]+g|0;b[3]=b[3]+j|0;b[4]=b[4]+h|0;b[5]=b[5]+m|0;b[6]=b[6]+n|0;b[7]=b[7]+q|0},_doFinalize:function(){var a=this._data,d=a.words,b=8*this._nDataBytes,e=8*a.sigBytes;
	d[e>>>5]|=128<<24-e%32;d[(e+64>>>9<<4)+14]=h.floor(b/4294967296);d[(e+64>>>9<<4)+15]=b;a.sigBytes=4*d.length;this._process();return this._hash},clone:function(){var a=q.clone.call(this);a._hash=this._hash.clone();return a}});s.SHA256=q._createHelper(f);s.HmacSHA256=q._createHmacHelper(f)})(Math);

	// HMAC SHA256
	(function(){var h=CryptoJS,s=h.enc.Utf8;h.algo.HMAC=h.lib.Base.extend({init:function(f,g){f=this._hasher=new f.init;"string"==typeof g&&(g=s.parse(g));var h=f.blockSize,m=4*h;g.sigBytes>m&&(g=f.finalize(g));g.clamp();for(var r=this._oKey=g.clone(),l=this._iKey=g.clone(),k=r.words,n=l.words,j=0;j<h;j++)k[j]^=1549556828,n[j]^=909522486;r.sigBytes=l.sigBytes=m;this.reset()},reset:function(){var f=this._hasher;f.reset();f.update(this._iKey)},update:function(f){this._hasher.update(f);return this},finalize:function(f){var g=
	this._hasher;f=g.finalize(f);g.reset();return g.finalize(this._oKey.clone().concat(f))}})})();

	// Base64
	(function(){var u=CryptoJS,p=u.lib.WordArray;u.enc.Base64={stringify:function(d){var l=d.words,p=d.sigBytes,t=this._map;d.clamp();d=[];for(var r=0;r<p;r+=3)for(var w=(l[r>>>2]>>>24-8*(r%4)&255)<<16|(l[r+1>>>2]>>>24-8*((r+1)%4)&255)<<8|l[r+2>>>2]>>>24-8*((r+2)%4)&255,v=0;4>v&&r+0.75*v<p;v++)d.push(t.charAt(w>>>6*(3-v)&63));if(l=t.charAt(64))for(;d.length%4;)d.push(l);return d.join("")},parse:function(d){var l=d.length,s=this._map,t=s.charAt(64);t&&(t=d.indexOf(t),-1!=t&&(l=t));for(var t=[],r=0,w=0;w<
	l;w++)if(w%4){var v=s.indexOf(d.charAt(w-1))<<2*(w%4),b=s.indexOf(d.charAt(w))>>>6-2*(w%4);t[r>>>2]|=(v|b)<<24-8*(r%4);r++}return p.create(t,r)},_map:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="}})();

	// BlockCipher
	(function(u){function p(b,n,a,c,e,j,k){b=b+(n&a|~n&c)+e+k;return(b<<j|b>>>32-j)+n}function d(b,n,a,c,e,j,k){b=b+(n&c|a&~c)+e+k;return(b<<j|b>>>32-j)+n}function l(b,n,a,c,e,j,k){b=b+(n^a^c)+e+k;return(b<<j|b>>>32-j)+n}function s(b,n,a,c,e,j,k){b=b+(a^(n|~c))+e+k;return(b<<j|b>>>32-j)+n}for(var t=CryptoJS,r=t.lib,w=r.WordArray,v=r.Hasher,r=t.algo,b=[],x=0;64>x;x++)b[x]=4294967296*u.abs(u.sin(x+1))|0;r=r.MD5=v.extend({_doReset:function(){this._hash=new w.init([1732584193,4023233417,2562383102,271733878])},
	_doProcessBlock:function(q,n){for(var a=0;16>a;a++){var c=n+a,e=q[c];q[c]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360}var a=this._hash.words,c=q[n+0],e=q[n+1],j=q[n+2],k=q[n+3],z=q[n+4],r=q[n+5],t=q[n+6],w=q[n+7],v=q[n+8],A=q[n+9],B=q[n+10],C=q[n+11],u=q[n+12],D=q[n+13],E=q[n+14],x=q[n+15],f=a[0],m=a[1],g=a[2],h=a[3],f=p(f,m,g,h,c,7,b[0]),h=p(h,f,m,g,e,12,b[1]),g=p(g,h,f,m,j,17,b[2]),m=p(m,g,h,f,k,22,b[3]),f=p(f,m,g,h,z,7,b[4]),h=p(h,f,m,g,r,12,b[5]),g=p(g,h,f,m,t,17,b[6]),m=p(m,g,h,f,w,22,b[7]),
	f=p(f,m,g,h,v,7,b[8]),h=p(h,f,m,g,A,12,b[9]),g=p(g,h,f,m,B,17,b[10]),m=p(m,g,h,f,C,22,b[11]),f=p(f,m,g,h,u,7,b[12]),h=p(h,f,m,g,D,12,b[13]),g=p(g,h,f,m,E,17,b[14]),m=p(m,g,h,f,x,22,b[15]),f=d(f,m,g,h,e,5,b[16]),h=d(h,f,m,g,t,9,b[17]),g=d(g,h,f,m,C,14,b[18]),m=d(m,g,h,f,c,20,b[19]),f=d(f,m,g,h,r,5,b[20]),h=d(h,f,m,g,B,9,b[21]),g=d(g,h,f,m,x,14,b[22]),m=d(m,g,h,f,z,20,b[23]),f=d(f,m,g,h,A,5,b[24]),h=d(h,f,m,g,E,9,b[25]),g=d(g,h,f,m,k,14,b[26]),m=d(m,g,h,f,v,20,b[27]),f=d(f,m,g,h,D,5,b[28]),h=d(h,f,
	m,g,j,9,b[29]),g=d(g,h,f,m,w,14,b[30]),m=d(m,g,h,f,u,20,b[31]),f=l(f,m,g,h,r,4,b[32]),h=l(h,f,m,g,v,11,b[33]),g=l(g,h,f,m,C,16,b[34]),m=l(m,g,h,f,E,23,b[35]),f=l(f,m,g,h,e,4,b[36]),h=l(h,f,m,g,z,11,b[37]),g=l(g,h,f,m,w,16,b[38]),m=l(m,g,h,f,B,23,b[39]),f=l(f,m,g,h,D,4,b[40]),h=l(h,f,m,g,c,11,b[41]),g=l(g,h,f,m,k,16,b[42]),m=l(m,g,h,f,t,23,b[43]),f=l(f,m,g,h,A,4,b[44]),h=l(h,f,m,g,u,11,b[45]),g=l(g,h,f,m,x,16,b[46]),m=l(m,g,h,f,j,23,b[47]),f=s(f,m,g,h,c,6,b[48]),h=s(h,f,m,g,w,10,b[49]),g=s(g,h,f,m,
	E,15,b[50]),m=s(m,g,h,f,r,21,b[51]),f=s(f,m,g,h,u,6,b[52]),h=s(h,f,m,g,k,10,b[53]),g=s(g,h,f,m,B,15,b[54]),m=s(m,g,h,f,e,21,b[55]),f=s(f,m,g,h,v,6,b[56]),h=s(h,f,m,g,x,10,b[57]),g=s(g,h,f,m,t,15,b[58]),m=s(m,g,h,f,D,21,b[59]),f=s(f,m,g,h,z,6,b[60]),h=s(h,f,m,g,C,10,b[61]),g=s(g,h,f,m,j,15,b[62]),m=s(m,g,h,f,A,21,b[63]);a[0]=a[0]+f|0;a[1]=a[1]+m|0;a[2]=a[2]+g|0;a[3]=a[3]+h|0},_doFinalize:function(){var b=this._data,n=b.words,a=8*this._nDataBytes,c=8*b.sigBytes;n[c>>>5]|=128<<24-c%32;var e=u.floor(a/
	4294967296);n[(c+64>>>9<<4)+15]=(e<<8|e>>>24)&16711935|(e<<24|e>>>8)&4278255360;n[(c+64>>>9<<4)+14]=(a<<8|a>>>24)&16711935|(a<<24|a>>>8)&4278255360;b.sigBytes=4*(n.length+1);this._process();b=this._hash;n=b.words;for(a=0;4>a;a++)c=n[a],n[a]=(c<<8|c>>>24)&16711935|(c<<24|c>>>8)&4278255360;return b},clone:function(){var b=v.clone.call(this);b._hash=this._hash.clone();return b}});t.MD5=v._createHelper(r);t.HmacMD5=v._createHmacHelper(r)})(Math);
	(function(){var u=CryptoJS,p=u.lib,d=p.Base,l=p.WordArray,p=u.algo,s=p.EvpKDF=d.extend({cfg:d.extend({keySize:4,hasher:p.MD5,iterations:1}),init:function(d){this.cfg=this.cfg.extend(d)},compute:function(d,r){for(var p=this.cfg,s=p.hasher.create(),b=l.create(),u=b.words,q=p.keySize,p=p.iterations;u.length<q;){n&&s.update(n);var n=s.update(d).finalize(r);s.reset();for(var a=1;a<p;a++)n=s.finalize(n),s.reset();b.concat(n)}b.sigBytes=4*q;return b}});u.EvpKDF=function(d,l,p){return s.create(p).compute(d,
	l)}})();

	// Cipher
	CryptoJS.lib.Cipher||function(u){var p=CryptoJS,d=p.lib,l=d.Base,s=d.WordArray,t=d.BufferedBlockAlgorithm,r=p.enc.Base64,w=p.algo.EvpKDF,v=d.Cipher=t.extend({cfg:l.extend(),createEncryptor:function(e,a){return this.create(this._ENC_XFORM_MODE,e,a)},createDecryptor:function(e,a){return this.create(this._DEC_XFORM_MODE,e,a)},init:function(e,a,b){this.cfg=this.cfg.extend(b);this._xformMode=e;this._key=a;this.reset()},reset:function(){t.reset.call(this);this._doReset()},process:function(e){this._append(e);return this._process()},
	finalize:function(e){e&&this._append(e);return this._doFinalize()},keySize:4,ivSize:4,_ENC_XFORM_MODE:1,_DEC_XFORM_MODE:2,_createHelper:function(e){return{encrypt:function(b,k,d){return("string"==typeof k?c:a).encrypt(e,b,k,d)},decrypt:function(b,k,d){return("string"==typeof k?c:a).decrypt(e,b,k,d)}}}});d.StreamCipher=v.extend({_doFinalize:function(){return this._process(!0)},blockSize:1});var b=p.mode={},x=function(e,a,b){var c=this._iv;c?this._iv=u:c=this._prevBlock;for(var d=0;d<b;d++)e[a+d]^=
	c[d]},q=(d.BlockCipherMode=l.extend({createEncryptor:function(e,a){return this.Encryptor.create(e,a)},createDecryptor:function(e,a){return this.Decryptor.create(e,a)},init:function(e,a){this._cipher=e;this._iv=a}})).extend();q.Encryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize;x.call(this,e,a,c);b.encryptBlock(e,a);this._prevBlock=e.slice(a,a+c)}});q.Decryptor=q.extend({processBlock:function(e,a){var b=this._cipher,c=b.blockSize,d=e.slice(a,a+c);b.decryptBlock(e,a);x.call(this,
	e,a,c);this._prevBlock=d}});b=b.CBC=q;q=(p.pad={}).Pkcs7={pad:function(a,b){for(var c=4*b,c=c-a.sigBytes%c,d=c<<24|c<<16|c<<8|c,l=[],n=0;n<c;n+=4)l.push(d);c=s.create(l,c);a.concat(c)},unpad:function(a){a.sigBytes-=a.words[a.sigBytes-1>>>2]&255}};d.BlockCipher=v.extend({cfg:v.cfg.extend({mode:b,padding:q}),reset:function(){v.reset.call(this);var a=this.cfg,b=a.iv,a=a.mode;if(this._xformMode==this._ENC_XFORM_MODE)var c=a.createEncryptor;else c=a.createDecryptor,this._minBufferSize=1;this._mode=c.call(a,
	this,b&&b.words)},_doProcessBlock:function(a,b){this._mode.processBlock(a,b)},_doFinalize:function(){var a=this.cfg.padding;if(this._xformMode==this._ENC_XFORM_MODE){a.pad(this._data,this.blockSize);var b=this._process(!0)}else b=this._process(!0),a.unpad(b);return b},blockSize:4});var n=d.CipherParams=l.extend({init:function(a){this.mixIn(a)},toString:function(a){return(a||this.formatter).stringify(this)}}),b=(p.format={}).OpenSSL={stringify:function(a){var b=a.ciphertext;a=a.salt;return(a?s.create([1398893684,
	1701076831]).concat(a).concat(b):b).toString(r)},parse:function(a){a=r.parse(a);var b=a.words;if(1398893684==b[0]&&1701076831==b[1]){var c=s.create(b.slice(2,4));b.splice(0,4);a.sigBytes-=16}return n.create({ciphertext:a,salt:c})}},a=d.SerializableCipher=l.extend({cfg:l.extend({format:b}),encrypt:function(a,b,c,d){d=this.cfg.extend(d);var l=a.createEncryptor(c,d);b=l.finalize(b);l=l.cfg;return n.create({ciphertext:b,key:c,iv:l.iv,algorithm:a,mode:l.mode,padding:l.padding,blockSize:a.blockSize,formatter:d.format})},
	decrypt:function(a,b,c,d){d=this.cfg.extend(d);b=this._parse(b,d.format);return a.createDecryptor(c,d).finalize(b.ciphertext)},_parse:function(a,b){return"string"==typeof a?b.parse(a,this):a}}),p=(p.kdf={}).OpenSSL={execute:function(a,b,c,d){d||(d=s.random(8));a=w.create({keySize:b+c}).compute(a,d);c=s.create(a.words.slice(b),4*c);a.sigBytes=4*b;return n.create({key:a,iv:c,salt:d})}},c=d.PasswordBasedCipher=a.extend({cfg:a.cfg.extend({kdf:p}),encrypt:function(b,c,d,l){l=this.cfg.extend(l);d=l.kdf.execute(d,
	b.keySize,b.ivSize);l.iv=d.iv;b=a.encrypt.call(this,b,c,d.key,l);b.mixIn(d);return b},decrypt:function(b,c,d,l){l=this.cfg.extend(l);c=this._parse(c,l.format);d=l.kdf.execute(d,b.keySize,b.ivSize,c.salt);l.iv=d.iv;return a.decrypt.call(this,b,c,d.key,l)}})}();

	// AES
	(function(){for(var u=CryptoJS,p=u.lib.BlockCipher,d=u.algo,l=[],s=[],t=[],r=[],w=[],v=[],b=[],x=[],q=[],n=[],a=[],c=0;256>c;c++)a[c]=128>c?c<<1:c<<1^283;for(var e=0,j=0,c=0;256>c;c++){var k=j^j<<1^j<<2^j<<3^j<<4,k=k>>>8^k&255^99;l[e]=k;s[k]=e;var z=a[e],F=a[z],G=a[F],y=257*a[k]^16843008*k;t[e]=y<<24|y>>>8;r[e]=y<<16|y>>>16;w[e]=y<<8|y>>>24;v[e]=y;y=16843009*G^65537*F^257*z^16843008*e;b[k]=y<<24|y>>>8;x[k]=y<<16|y>>>16;q[k]=y<<8|y>>>24;n[k]=y;e?(e=z^a[a[a[G^z]]],j^=a[a[j]]):e=j=1}var H=[0,1,2,4,8,
	16,32,64,128,27,54],d=d.AES=p.extend({_doReset:function(){for(var a=this._key,c=a.words,d=a.sigBytes/4,a=4*((this._nRounds=d+6)+1),e=this._keySchedule=[],j=0;j<a;j++)if(j<d)e[j]=c[j];else{var k=e[j-1];j%d?6<d&&4==j%d&&(k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255]):(k=k<<8|k>>>24,k=l[k>>>24]<<24|l[k>>>16&255]<<16|l[k>>>8&255]<<8|l[k&255],k^=H[j/d|0]<<24);e[j]=e[j-d]^k}c=this._invKeySchedule=[];for(d=0;d<a;d++)j=a-d,k=d%4?e[j]:e[j-4],c[d]=4>d||4>=j?k:b[l[k>>>24]]^x[l[k>>>16&255]]^q[l[k>>>
	8&255]]^n[l[k&255]]},encryptBlock:function(a,b){this._doCryptBlock(a,b,this._keySchedule,t,r,w,v,l)},decryptBlock:function(a,c){var d=a[c+1];a[c+1]=a[c+3];a[c+3]=d;this._doCryptBlock(a,c,this._invKeySchedule,b,x,q,n,s);d=a[c+1];a[c+1]=a[c+3];a[c+3]=d},_doCryptBlock:function(a,b,c,d,e,j,l,f){for(var m=this._nRounds,g=a[b]^c[0],h=a[b+1]^c[1],k=a[b+2]^c[2],n=a[b+3]^c[3],p=4,r=1;r<m;r++)var q=d[g>>>24]^e[h>>>16&255]^j[k>>>8&255]^l[n&255]^c[p++],s=d[h>>>24]^e[k>>>16&255]^j[n>>>8&255]^l[g&255]^c[p++],t=
	d[k>>>24]^e[n>>>16&255]^j[g>>>8&255]^l[h&255]^c[p++],n=d[n>>>24]^e[g>>>16&255]^j[h>>>8&255]^l[k&255]^c[p++],g=q,h=s,k=t;q=(f[g>>>24]<<24|f[h>>>16&255]<<16|f[k>>>8&255]<<8|f[n&255])^c[p++];s=(f[h>>>24]<<24|f[k>>>16&255]<<16|f[n>>>8&255]<<8|f[g&255])^c[p++];t=(f[k>>>24]<<24|f[n>>>16&255]<<16|f[g>>>8&255]<<8|f[h&255])^c[p++];n=(f[n>>>24]<<24|f[g>>>16&255]<<16|f[h>>>8&255]<<8|f[k&255])^c[p++];a[b]=q;a[b+1]=s;a[b+2]=t;a[b+3]=n},keySize:8});u.AES=p._createHelper(d)})();

	// Mode ECB
	CryptoJS.mode.ECB = (function () {
	    var ECB = CryptoJS.lib.BlockCipherMode.extend();

	    ECB.Encryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.encryptBlock(words, offset);
	        }
	    });

	    ECB.Decryptor = ECB.extend({
	        processBlock: function (words, offset) {
	            this._cipher.decryptBlock(words, offset);
	        }
	    });

	    return ECB;
	}());

/***/ },
/* 91 */
/***/ function(module, exports, __webpack_require__) {

	var uuid = __webpack_require__(60);
	var Promise = __webpack_require__(84).Promise;

	/**
	 * A conversation
	 * Holds meta data for a conversation between two peers
	 * @param {Object} [config] Configuration options:
	 *                          {string} [id]      A unique id for the conversation. If not provided, a uuid is generated
	 *                          {string} self      Id of the peer on this side of the conversation
	 *                          {string} other     Id of the peer on the other side of the conversation
	 *                          {Object} [context] Context passed with all callbacks of the conversation
	 *                          {function(to: string, message: *): Promise} send   Function to send a message
	 * @constructor
	 */
	function Conversation (config) {
	  if (!(this instanceof Conversation)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  // public properties
	  this.id =       config && config.id       || uuid.v4();
	  this.self =     config && config.self     || null;
	  this.other =    config && config.other    || null;
	  this.context =  config && config.context  || {};

	  // private properties
	  this._send =    config && config.send     || null;
	  this._inbox = [];     // queue with received but not yet picked messages
	  this._receivers = []; // queue with handlers waiting for a new message
	}

	// type information
	Conversation.prototype.isConversation = true;

	/**
	 * Send a message
	 * @param {*} message
	 * @return {Promise.<null>} Resolves when the message has been sent
	 */
	Conversation.prototype.send = function (message) {
	  return this._send(this.other, {
	    id: this.id,
	    from: this.self,
	    to: this.other,
	    message: message
	  });
	};

	/**
	 * Deliver a message
	 * @param {{id: string, from: string, to: string, message: string}} envelope
	 */
	Conversation.prototype.deliver = function (envelope) {
	  if (this._receivers.length) {
	    var receiver = this._receivers.shift();
	    receiver(envelope.message);
	  }
	  else {
	    this._inbox.push(envelope.message);
	  }
	};

	/**
	 * Receive a message.
	 * @returns {Promise.<*>} Resolves with a message as soon as a message
	 *                        is delivered.
	 */
	Conversation.prototype.receive = function () {
	  var me = this;

	  if (this._inbox.length) {
	    return Promise.resolve(this._inbox.shift());
	  }
	  else {
	    return new Promise(function (resolve) {
	      me._receivers.push(resolve);
	    })
	  }
	};

	module.exports = Conversation;


/***/ },
/* 92 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Abstract control flow diagram block
	 * @constructor
	 */
	function Block() {
	  this.next = null;
	  this.previous = null;
	}

	// type information
	Block.prototype.isBlock = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Block.prototype.execute = function (conversation, message) {
	  throw new Error('Cannot run an abstract Block');
	};

	module.exports = Block;


/***/ },
/* 93 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;
	var Block = __webpack_require__(92);
	var isPromise = __webpack_require__(94).isPromise;

	/**
	 * Then
	 * Execute a callback function or a next block in the chain.
	 * @param {Function} callback   Invoked as callback(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 * @constructor
	 * @extends {Block}
	 */
	function Then (callback) {
	  if (!(this instanceof Then)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (!(typeof callback === 'function')) {
	    throw new TypeError('Parameter callback must be a Function');
	  }

	  this.callback = callback;
	}

	Then.prototype = Object.create(Block.prototype);
	Then.prototype.constructor = Then;

	// type information
	Then.prototype.isThen = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Then.prototype.execute = function (conversation, message) {
	  var me = this;
	  var result = this.callback(message, conversation.context);

	  var resolve = isPromise(result) ? result : Promise.resolve(result);

	  return resolve.then(function (result) {
	    return {
	      result: result,
	      block: me.next
	    }
	  });
	};

	/**
	 * Chain a block to the current block.
	 *
	 * When a function is provided, a Then block will be generated which
	 * executes the function. The function is invoked as callback(message, context),
	 * where `message` is the output from the previous block in the chain,
	 * and `context` is an object where state can be stored during a conversation.
	 *
	 * @param {Block | function} next   A callback function or Block.
	 * @return {Block} Returns the appended block
	 */
	Block.prototype.then = function (next) {
	  // turn a callback function into a Then block
	  if (typeof next === 'function') {
	    next = new Then(next);
	  }

	  if (!next || !next.isBlock) {
	    throw new TypeError('Parameter next must be a Block or function');
	  }

	  // append after the last block
	  next.previous = this;
	  this.next = next;

	  // return the appended block
	  return next;
	};

	module.exports = Then;


/***/ },
/* 94 */
/***/ function(module, exports) {

	/**
	 * Test whether the provided value is a Promise.
	 * A value is marked as a Promise when it is an object containing functions
	 * `then` and `catch`.
	 * @param {*} value
	 * @return {boolean} Returns true when `value` is a Promise
	 */
	exports.isPromise = function (value) {
	  return value &&
	      typeof value['then'] === 'function' &&
	      typeof value['catch'] === 'function'
	};


/***/ },
/* 95 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;
	var Block = __webpack_require__(92);
	var isPromise = __webpack_require__(94).isPromise;

	__webpack_require__(93);   // extend Block with function then
	__webpack_require__(96); // extend Block with function listen

	/**
	 * Tell
	 * Send a message to the other peer.
	 * @param {* | Function} message  A static message or callback function
	 *                                returning a message dynamically.
	 *                                When `message` is a function, it will be
	 *                                invoked as callback(message, context),
	 *                                where `message` is the output from the
	 *                                previous block in the chain, and `context` is
	 *                                an object where state can be stored during a
	 *                                conversation.
	 * @constructor
	 * @extends {Block}
	 */
	function Tell (message) {
	  if (!(this instanceof Tell)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  this.message = message;
	}

	Tell.prototype = Object.create(Block.prototype);
	Tell.prototype.constructor = Tell;

	// type information
	Tell.prototype.isTell = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} [message] A message is ignored by the Tell block
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Tell.prototype.execute = function (conversation, message) {
	  // resolve the message
	  var me = this;
	  var resolve;
	  if (typeof this.message === 'function') {
	    var result = this.message(message, conversation.context);
	    resolve = isPromise(result) ? result : Promise.resolve(result);
	  }
	  else {
	    resolve = Promise.resolve(this.message); // static string or value
	  }

	  return resolve
	      .then(function (result) {
	        var res = conversation.send(result);
	        var done = isPromise(res) ? res : Promise.resolve(res);

	        return done.then(function () {
	            return {
	              result: result,
	              block: me.next
	            };
	          });
	      });
	};

	/**
	 * Create a Tell block and chain it to the current block
	 * @param {* | Function} [message] A static message or callback function
	 *                                 returning a message dynamically.
	 *                                 When `message` is a function, it will be
	 *                                 invoked as callback(message, context),
	 *                                 where `message` is the output from the
	 *                                 previous block in the chain, and `context` is
	 *                                 an object where state can be stored during a
	 *                                 conversation.
	 * @return {Block}                 Returns the appended block
	 */
	Block.prototype.tell = function (message) {
	  var block = new Tell(message);

	  return this.then(block);
	};

	/**
	 * Send a question, listen for a response.
	 * Creates two blocks: Tell and Listen.
	 * This is equivalent of doing `babble.tell(message).listen(callback)`
	 * @param {* | Function} message
	 * @param {Function} [callback] Invoked as callback(message, context),
	 *                              where `message` is the just received message,
	 *                              and `context` is an object where state can be
	 *                              stored during a conversation. This is equivalent
	 *                              of doing `listen().then(callback)`
	 * @return {Block}              Returns the appended block
	 */
	Block.prototype.ask = function (message, callback) {
	  // FIXME: this doesn't work
	  return this
	      .tell(message)
	      .listen(callback);
	};

	module.exports = Tell;


/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;
	var Block = __webpack_require__(92);
	var Then = __webpack_require__(93);

	/**
	 * Listen
	 * Wait until a message comes in from the connected peer, then continue
	 * with the next block in the control flow.
	 *
	 * @constructor
	 * @extends {Block}
	 */
	function Listen () {
	  if (!(this instanceof Listen)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }
	}

	Listen.prototype = Object.create(Block.prototype);
	Listen.prototype.constructor = Listen;

	// type information
	Listen.prototype.isListen = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} [message]   Message is ignored by Listen blocks
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Listen.prototype.execute = function (conversation, message) {
	  var me = this;

	  // wait until a message is received
	  return conversation.receive()
	      .then(function (message) {
	        return {
	          result: message,
	          block: me.next
	        }
	      });
	};

	/**
	 * Create a Listen block and chain it to the current block
	 *
	 * Optionally a callback function can be provided, which is equivalent of
	 * doing `listen().then(callback)`.
	 *
	 * @param {Function} [callback] Executed as callback(message: *, context: Object)
	 *                              Must return a result
	 * @return {Block}              Returns the appended block
	 */
	Block.prototype.listen = function (callback) {
	  var listen = new Listen();
	  var block = this.then(listen);
	  if (callback) {
	    block = block.then(callback);
	  }
	  return block;
	};

	module.exports = Listen;


/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;
	var Block = __webpack_require__(92);
	var isPromise = __webpack_require__(94).isPromise;

	__webpack_require__(93); // extend Block with function then

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @constructor
	 * @extends {Block}
	 */
	function IIf (condition, trueBlock, falseBlock) {
	  if (!(this instanceof IIf)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (typeof condition === 'function') {
	    this.condition = condition;
	  }
	  else if (condition instanceof RegExp) {
	    this.condition = function (message, context) {
	      return condition.test(message);
	    }
	  }
	  else {
	    this.condition = function (message, context) {
	      return message == condition;
	    }
	  }

	  if (trueBlock && !trueBlock.isBlock) {
	    throw new TypeError('Parameter trueBlock must be a Block');
	  }

	  if (falseBlock && !falseBlock.isBlock) {
	    throw new TypeError('Parameter falseBlock must be a Block');
	  }

	  this.trueBlock = trueBlock || null;
	  this.falseBlock = falseBlock || null;
	}

	IIf.prototype = Object.create(Block.prototype);
	IIf.prototype.constructor = IIf;

	// type information
	IIf.prototype.isIIf = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	IIf.prototype.execute = function (conversation, message) {
	  var me = this;
	  var condition = this.condition(message, conversation.context);

	  var resolve = isPromise(condition) ? condition : Promise.resolve(condition);

	  return resolve.then(function (condition) {
	    var next = condition ? (me.trueBlock || me.next) : me.falseBlock;

	    return {
	      result: message,
	      block: next
	    };
	  });
	};

	/**
	 * IIf
	 * Create an iif block, which checks a condition and continues either with
	 * the trueBlock or the falseBlock. The input message is passed to the next
	 * block in the flow.
	 *
	 * Can be used as follows:
	 * - When `condition` evaluates true:
	 *   - when `trueBlock` is provided, the flow continues with `trueBlock`
	 *   - else, when there is a block connected to the IIf block, the flow continues
	 *     with that block.
	 * - When `condition` evaluates false:
	 *   - when `falseBlock` is provided, the flow continues with `falseBlock`
	 *
	 * Syntax:
	 *
	 *     new IIf(condition, trueBlock)
	 *     new IIf(condition, trueBlock [, falseBlock])
	 *     new IIf(condition).then(...)
	 *
	 * @param {Function | RegExp | *} condition   A condition returning true or false
	 *                                            In case of a function,
	 *                                            the function is invoked as
	 *                                            `condition(message, context)` and
	 *                                            must return a boolean. In case of
	 *                                            a RegExp, condition will be tested
	 *                                            to return true. In other cases,
	 *                                            non-strict equality is tested on
	 *                                            the input.
	 * @param {Block} [trueBlock]
	 * @param {Block} [falseBlock]
	 * @returns {Block} Returns the created IIf block
	 */
	Block.prototype.iif = function (condition, trueBlock, falseBlock) {
	  var iif = new IIf(condition, trueBlock, falseBlock);

	  return this.then(iif);
	};

	module.exports = IIf;


/***/ },
/* 98 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(84).Promise;
	var Block = __webpack_require__(92);
	var isPromise =__webpack_require__(94).isPromise;

	__webpack_require__(93); // extend Block with function then

	/**
	 * Decision
	 * A decision is made by executing the provided callback function, which returns
	 * a next control flow block.
	 *
	 * Syntax:
	 *
	 *     new Decision(choices)
	 *     new Decision(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param arg1
	 * @param arg2
	 * @constructor
	 * @extends {Block}
	 */
	function Decision (arg1, arg2) {
	  var decision, choices;

	  if (!(this instanceof Decision)) {
	    throw new SyntaxError('Constructor must be called with the new operator');
	  }

	  if (typeof arg1 === 'function') {
	    decision = arg1;
	    choices = arg2;
	  }
	  else {
	    decision = null;
	    choices = arg1;
	  }

	  if (decision) {
	    if (typeof decision !== 'function') {
	      throw new TypeError('Parameter decision must be a function');
	    }
	  }
	  else {
	    decision = function (message, context) {
	      return message;
	    }
	  }

	  if (choices && (typeof choices === 'function')) {
	    throw new TypeError('Parameter choices must be an object');
	  }

	  this.decision = decision;
	  this.choices = {};

	  // append all choices
	  if (choices) {
	    var me = this;
	    Object.keys(choices).forEach(function (id) {
	      me.addChoice(id, choices[id]);
	    });
	  }
	}

	Decision.prototype = Object.create(Block.prototype);
	Decision.prototype.constructor = Decision;

	// type information
	Decision.prototype.isDecision = true;

	/**
	 * Execute the block
	 * @param {Conversation} conversation
	 * @param {*} message
	 * @return {Promise.<{result: *, block: Block}, Error>} next
	 */
	Decision.prototype.execute = function (conversation, message) {
	  var me = this;
	  var id = this.decision(message, conversation.context);

	  var resolve = isPromise(id) ? id : Promise.resolve(id);
	  return resolve.then(function (id) {
	    var next = me.choices[id];

	    if (!next) {
	      // there is no match, fall back on the default choice
	      next = me.choices['default'];
	    }

	    if (!next) {
	      throw new Error('Block with id "' + id + '" not found');
	    }

	    return {
	      result: message,
	      block: next
	    };
	  });
	};

	/**
	 * Add a choice to the decision block.
	 * The choice can be a new chain of blocks. The first block of the chain
	 * will be triggered when the this id comes out of the decision function.
	 * @param {String | 'default'} id
	 * @param {Block} block
	 * @return {Decision} self
	 */
	Decision.prototype.addChoice = function (id, block) {
	  if (typeof id !== 'string') {
	    throw new TypeError('String expected as choice id');
	  }

	  if (!block || !block.isBlock) {
	    throw new TypeError('Block expected as choice');
	  }

	  if (id in this.choices) {
	    throw new Error('Choice with id "' + id + '" already exists');
	  }

	  // find the first block of the chain
	  var first = block;
	  while (first && first.previous) {
	    first = first.previous;
	  }

	  this.choices[id] = first;

	  return this;
	};

	/**
	 * Create a decision block and chain it to the current block.
	 * Returns the first block in the chain.
	 *
	 * Syntax:
	 *
	 *     decide(choices)
	 *     decide(decision, choices)
	 *
	 * Where:
	 *
	 *     {Function | Object} [decision]
	 *                              When a `decision` function is provided, the
	 *                              function is invoked as decision(message, context),
	 *                              where `message` is the output from the previous
	 *                              block in the chain, and `context` is an object
	 *                              where state can be stored during a conversation.
	 *                              The function must return the id for the next
	 *                              block in the control flow, which must be
	 *                              available in the provided `choices`.
	 *                              If `decision` is not provided, the next block
	 *                              will be mapped directly from the message.
	 *     {Object.<String, Block>} choices
	 *                              A map with the possible next blocks in the flow
	 *                              The next block is selected by the id returned
	 *                              by the decision function.
	 *
	 * There is one special id for choices: 'default'. This id is called when either
	 * the decision function returns an id which does not match any of the available
	 * choices.
	 *
	 * @param {Function | Object} arg1  Can be {function} decision or {Object} choices
	 * @param {Object} [arg2]           choices
	 * @return {Block} first            First block in the chain
	 */
	Block.prototype.decide = function (arg1, arg2) {
	  var decision = new Decision(arg1, arg2);

	  return this.then(decision);
	};

	module.exports = Decision;


/***/ },
/* 99 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Create a pattern listener onto an Agent.
	 * A new handler is added to the agents _receiver function.
	 * Creates a Pattern instance with functions `listen` and `unlisten`.
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Can contain properties:
	 *                            - stopPropagation: boolean
	 *                                                When false (default), a message
	 *                                                will be delivered at all
	 *                                                matching pattern listeners.
	 *                                                When true, a message will be
	 *                                                be delivered at the first
	 *                                                matching pattern listener only.
	 */
	function PatternModule(agent, options) {
	  this.agent = agent;
	  this.stopPropagation = options && options.stopPropagation || false;
	  this.receiveOriginal = agent._receive;
	  this.listeners = [];
	}

	PatternModule.prototype.type = 'pattern';

	/**
	 * Receive a message.
	 * All pattern listeners will be checked against their patterns, and if there
	 * is a match, the pattern listeners callback function is invoked.
	 * @param {string} from     Id of sender
	 * @param {*} message       Received message, a JSON object (often a string)
	 */
	PatternModule.prototype.receive = function(from, message) {
	  var response;
	  var responses = [];
	  for (var i = 0, ii = this.listeners.length; i < ii; i++) {
	    var listener = this.listeners[i];
	    var pattern = listener.pattern;
	    var match = (pattern instanceof Function && pattern(message)) ||
	        (pattern instanceof RegExp && pattern.test(message)) ||
	        (pattern == message);

	    if (match) {
	      response = listener.callback.call(this.agent, from, message);
	      responses.push(response);
	      if (this.stopPropagation) {
	        return responses[0];
	      }
	    }
	  }

	  response = this.receiveOriginal.call(this.agent, from, message);
	  responses.push(response);
	  return responses[0];
	};

	/**
	 * Add a pattern listener for incoming messages
	 * @param {string | RegExp | Function} pattern    Message pattern
	 * @param {Function} callback                     Callback function invoked when
	 *                                                a message matching the pattern
	 *                                                is received.
	 *                                                Invoked as callback(from, message)
	 */
	PatternModule.prototype.listen = function(pattern, callback) {
	  this.listeners.push({
	    pattern: pattern,
	    callback: callback
	  });
	};

	/**
	 * Remove a pattern listener for incoming messages
	 * @param {string | RegExp | Function} pattern    Message pattern
	 * @param {Function} callback
	 */
	PatternModule.prototype.unlisten = function(pattern, callback) {
	  for (var i = 0, ii = this.listeners.length; i < ii; i++) {
	    var listener = this.listeners[i];
	    if (listener.pattern === pattern && listener.callback === callback) {
	      this.listeners.splice(i, 1);
	      break;
	    }
	  }
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, listen: function, unlisten: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	PatternModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    listen: this.listen.bind(this),
	    unlisten: this.unlisten.bind(this)
	  }
	};

	module.exports = PatternModule;


/***/ },
/* 100 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(12);
	var Promise = __webpack_require__(2);
	var util = __webpack_require__(13);

	var TIMEOUT = 60000; // ms

	/**
	 * Create a Request module.
	 * The module attaches a handler to the agents _receive function.
	 * Creates a Request instance with function `request`.
	 * @param {Agent} agent
	 * @param {Object} [options]   Optional parameters. Can contain properties:
	 *                            - timeout: number   A timeout for responses in
	 *                                                milliseconds. 60000 ms by
	 *                                                default.
	 */
	function RequestModule(agent, options) {
	  this.agent = agent;
	  this.receiveOriginal = agent._receive;
	  this.timeout = options && options.timeout || TIMEOUT;
	  this.queue = [];
	}

	RequestModule.prototype.type = 'request';

	/**
	 * Event handler, handles incoming messages
	 * @param {String} from     Id of the sender
	 * @param {*} message
	 * @return {boolean} Returns true when a message is handled, else returns false
	 */
	RequestModule.prototype.receive = function (from, message) {
	  var agent = this.agent;

	  if (typeof message === 'object') {
	    var envelope = message;

	    // match the request from the id in the response
	    var request = this.queue[envelope.id];
	    if (request) {
	      // remove the request from the queue
	      clearTimeout(request.timeout);
	      delete this.queue[envelope.id];

	      // resolve the requests promise with the response message
	      if (envelope.error) {
	        // TODO: turn this into an Error instance again
	        request.reject(new Error(envelope.error));
	      }
	      else {
	        request.resolve(envelope.message);
	      }
	      return true;
	    }
	    else if (message.type == 'request') {
	      try {
	        var response = this.receiveOriginal.call(agent, from, message.message);
	        if (util.isPromise(response)) {
	          // wait until the promise resolves
	          response
	              .then(function (result) {
	                agent.send(from, {type: 'request', id: message.id, message: result});
	              })
	              .catch(function (err) {
	                agent.send(from, {type: 'request', id: message.id, error: err.message || err.toString()});
	              });
	        }
	        else {
	          // immediately send a result
	          agent.send(from, {type: 'request', id: message.id, message: response });
	        }
	      }
	      catch (err) {
	        agent.send(from, {type: 'request', id: message.id, error: err.message || err.toString()});
	      }
	    }
	  }
	  else {
	    if (this.receiveOriginal) {
	      this.receiveOriginal.call(agent, from, message);
	    }
	  }
	};

	/**
	 * Send a request
	 * @param {string} to   Id of the recipient
	 * @param {*} message
	 * @returns {Promise.<*, Error>} Returns a promise resolving with the response message
	 */
	RequestModule.prototype.request = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    // put the data in an envelope with id
	    var id = uuid();
	    var envelope = {
	      type: 'request',
	      id: id,
	      message: message
	    };

	    // add the request to the list with requests in progress
	    me.queue[id] = {
	      resolve: resolve,
	      reject: reject,
	      timeout: setTimeout(function () {
	        delete me.queue[id];
	        reject(new Error('Timeout'));
	      }, me.timeout)
	    };

	    me.agent.send(to, envelope)
	        .catch(function (err) {
	          reject(err);
	        });
	  });
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, request: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	RequestModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    request: this.request.bind(this)
	  }
	};

	module.exports = RequestModule;


/***/ },
/* 101 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(12);
	var Promise = __webpack_require__(2);
	var util = __webpack_require__(13);


	/**
	 *
	 * @param {Agent} agent
	 * @param {Object} availableFunctions
	 * @constructor
	 */
	function RPCModule(agent, availableFunctions, options) {
	  this.agent = agent;
	  this.receiveOriginal = agent._receive;
	  this.queue = {};
	  this.promiseTimeout = options && options.timeout || 1500; // 1 second

	  // check the available functions
	  if (availableFunctions instanceof Array) {
	    this.functionsFromArray(availableFunctions);
	  }
	  else if (availableFunctions instanceof Object) {
	    this.availableFunctions = availableFunctions;
	  }
	  else {
	    console.log('cannot use RPC with the supplied functions', availableFunctions);
	  }
	}

	RPCModule.prototype.type = 'rpc';

	/**
	 *
	 * @param availableFunctions
	 */
	RPCModule.prototype.functionsFromArray = function (availableFunctions) {
	  this.availableFunctions = {};
	  for (var i = 0; i < availableFunctions.length; i++) {
	    var fn = availableFunctions[i];
	    this.availableFunctions[fn] = this.agent[fn];
	  }
	};


	/**
	 *
	 * @param to
	 * @param message
	 * @returns {Promise}
	 */
	RPCModule.prototype.request = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    // prepare the envelope
	    if (typeof message  !=  'object' ) {reject(new TypeError('Message must be an object'));}
	    if (message.jsonrpc !== '2.0'    ) {message.jsonrpc = '2.0';}
	    if (message.id      === undefined) {message.id = uuid();}
	    if (message.method  === undefined) {reject(new Error('Property "method" expected'));}
	    if (message.params  === undefined) {message.params = {};}

	    // add the request to the list with requests in progress
	    me.queue[message.id] = {
	      resolve: resolve,
	      reject: reject,
	      timeout: setTimeout(function () {
	        delete me.queue[message.id];
	        reject(new Error('RPC Promise Timeout surpassed. Timeout: ' + me.promiseTimeout / 1000 + 's'));
	      }, me.promiseTimeout)
	    };
	    var sendRequest = me.agent.send(to, message);
	    if (util.isPromise(sendRequest) == true) {
	      sendRequest.catch(function (err) {reject(err);});
	    }
	  });
	};



	/**
	 *
	 * @param from
	 * @param message
	 * @returns {*}
	 */
	RPCModule.prototype.receive = function (from, message) {
	  if (typeof message == 'object') {
	    if (message.jsonrpc == '2.0') {
	      this._receive(from, message);
	    }
	    else {
	      this.receiveOriginal.call(this.agent, from, message);
	    }
	  }
	  else {
	    this.receiveOriginal.call(this.agent, from, message);
	  }
	};


	/**
	 *
	 * @param from
	 * @param message
	 * @returns {*}
	 * @private
	 */
	RPCModule.prototype._receive = function (from, message) {
	  // define structure of return message
	  var returnMessage = {jsonrpc:'2.0', id:message.id};

	  // check if this is a request
	  if (message.method !== undefined) {
	    // check is method is available for this agent
	    var method = this.availableFunctions[message.method];
	    if (method !== undefined) {
	      var response = method.call(this.agent, message.params, from) || null;
	      // check if response is a promise
	      if (util.isPromise(response)) {
	        var me = this;
	        response
	          .then(function (result) {
	            returnMessage.result = result;
	            me.agent.send(from, returnMessage)
	          })
	          .catch(function (error) {
	            returnMessage.error = error.message || error.toString();
	            me.agent.send(from, returnMessage);
	          })
	      }
	      else {
	        returnMessage.result = response;
	        this.agent.send(from, returnMessage);
	      }
	    }
	    else {
	      var error = new Error('Cannot find function: ' + message.method);
	      returnMessage.error = error.message || error.toString();
	      this.agent.send(from, returnMessage);
	    }
	  }
	  // check if this is a response
	  else if (message.result !== undefined || message.error !== undefined) {
	    var request = this.queue[message.id];
	    if (request !== undefined) {
	      // if an error is defined, reject promise
	      if (message.error != undefined) { // null or undefined
	        if (typeof message == 'object') {
	          request.reject(message.error);
	        }
	        else {
	          request.reject(new Error(message.error));
	        }
	      }
	      else {
	        request.resolve(message.result);
	      }
	    }
	  }
	  else {
	    // send error back to sender.
	    var error = new Error('No method or result defined. Message:' + JSON.stringify(message));
	    returnMessage.error = error.message || error.toString();
	    // FIXME: returned error should be an object {code: number, message: string}
	    this.agent.send(from, returnMessage);
	  }
	};

	/**
	 * Get a map with mixin functions
	 * @return {{_receive: function, request: function}}
	 *            Returns mixin function, which can be used to extend the agent.
	 */
	RPCModule.prototype.mixin = function () {
	  return {
	    _receive: this.receive.bind(this),
	    request: this.request.bind(this)
	  }
	};

	module.exports = RPCModule;

/***/ },
/* 102 */
/***/ function(module, exports) {

	'use strict';

	/**
	 * Abstract prototype of a transport
	 * @param {Object} [config]
	 * @constructor
	 */
	function Transport(config) {
	  this.id = config && config.id || null;
	  this['default'] = config && config['default'] || false;
	}

	Transport.prototype.type = null;

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {Connection}       Returns a connection
	 */
	Transport.prototype.connect = function(id, receive) {
	  throw new Error('Cannot invoke abstract function "connect"');
	};

	/**
	 * Close the transport
	 */
	Transport.prototype.close = function() {
	  throw new Error('Cannot invoke abstract function "close"');
	};

	module.exports = Transport;


/***/ },
/* 103 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var Transport = __webpack_require__(102);
	var AMQPConnection = __webpack_require__(104);

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
	  this.id = config.id || null;
	  this.url = config.url || (config.host && "amqp://" + config.host) || null;
	  this['default'] = config['default'] || false;

	  this.networkId = this.url;
	  this.connection = null;
	  this.config = config;
	}

	AMQPTransport.prototype = new Transport();
	AMQPTransport.prototype.type = 'amqp';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive     Invoked as receive(from, message)
	 * @return {AMQPConnection} Returns a connection.
	 */
	AMQPTransport.prototype.connect = function (id, receive) {
	  // require AMQP here and not in the header,
	  // it will be excluded from the browser bundle and else the missing library
	  // throws an error on load.
	  var AMQP = __webpack_require__(!(function webpackMissingModule() { var e = new Error("Cannot find module \"amqplib/callback_api\""); e.code = 'MODULE_NOT_FOUND'; throw e; }()));

	  var me = this;
	  var ready = new Promise(function (resolve, reject) {
	    if (me.connection == null) {
	      AMQP.connect(me.url, function (err, conn) {
	        if (err != null) {
	          console.error(err);
	        } else {
	          me.connection = conn;
	          resolve();
	        }
	      });
	    } else {
	      resolve();
	    }
	  });
	  return new AMQPConnection(me, id, receive, ready);
	};

	/**
	 * Close the transport.
	 */
	AMQPTransport.prototype.close = function () {
	  if (this.connection != null) {
	    this.connection.close();
	    this.connection = null;
	  }
	};

	module.exports = AMQPTransport;


/***/ },
/* 104 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(Buffer) {'use strict';

	var Promise = __webpack_require__(2);
	var Connection = __webpack_require__(105);

	/**
	 * A local connection.
	 * @param {AMQPTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function AMQPConnection(transport, id, receive, connReady) {
	  this.transport = transport;
	  this.id = id;
	  this.channel = null;

	  var me = this;
	  this.ready = new Promise(function (resolve, reject) {
	    connReady.then(function () {
	      me.transport.connection.createChannel(function (err, ch) {
	        if (err != null) {
	          console.error(err);
	          reject();
	        } else {
	          me.channel = ch;
	          ch.assertQueue(me.id);
	          ch.consume(me.id, function (message) {
	              if (message !== null && message.content && message.content.toString() != "") {
	                var body = JSON.parse(message.content.toString());
	                if (body.to != me.id) {
	                  console.warn("Received message not meant for me?", body);
	                } else {
	                  receive(body.from, body.message);
	                }
	                ch.ack(message);
	              }
	            }
	          );
	          resolve();
	        }
	      });
	    });
	  })
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	AMQPConnection.prototype.send = function (to, message) {
	  if (this.channel != null) {
	    var msg = {
	      from: this.id,
	      to: to,
	      message: message
	    };
	    this.channel.sendToQueue(to, new Buffer(JSON.stringify(msg), "utf-8"));
	  } else {
	    console.log("No channel open");
	  }
	};


	/**
	 * Close the connection
	 */
	AMQPConnection.prototype.close = function () {
	  if (this.channel != null) {
	    this.channel.close();
	  }
	  this.channel = null;
	};

	module.exports = AMQPConnection;

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(61).Buffer))

/***/ },
/* 105 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);

	/**
	 * An abstract Transport connection
	 * @param {Transport} transport
	 * @param {string} id
	 * @param {function} receive
	 * @constructor
	 * @abstract
	 */
	function Connection (transport, id, receive) {
	  throw new Error('Cannot create an abstract Connection');
	}

	Connection.prototype.ready = Promise.reject(new Error('Cannot get abstract property ready'));

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	Connection.prototype.send = function (to, message) {
	  throw new Error('Cannot call abstract function send');
	};

	/**
	 * Close the connection, disconnect from the transport.
	 */
	Connection.prototype.close = function () {
	  throw new Error('Cannot call abstract function "close"');
	};

	module.exports = Connection;


/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var distribus = __webpack_require__(107);
	var Transport = __webpack_require__(102);
	var DistribusConnection = __webpack_require__(108);

	/**
	 * Use distribus as transport
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `host: distribus.Host`. Optional
	 *                                If `host` is not provided,
	 *                                a new local distribus Host is created.
	 * @constructor
	 */
	function DistribusTransport(config) {
	  this.id = config && config.id || null;
	  this['default'] = config && config['default'] || false;
	  this.host = config && config.host || new distribus.Host(config);

	  this.networkId = this.host.networkId; // FIXME: networkId can change when host connects to another host.
	}

	DistribusTransport.prototype = new Transport();

	DistribusTransport.prototype.type = 'distribus';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive     Invoked as receive(from, message)
	 * @return {DistribusConnection} Returns a connection.
	 */
	DistribusTransport.prototype.connect = function(id, receive) {
	  return new DistribusConnection(this, id, receive);
	};

	/**
	 * Close the transport.
	 */
	DistribusTransport.prototype.close = function() {
	  this.host.close();
	  this.host = null;
	};

	module.exports = DistribusTransport;


/***/ },
/* 107 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_107__;

/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var Connection = __webpack_require__(105);

	/**
	 * A local connection.
	 * @param {DistribusTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function DistribusConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // create a peer
	  var peer = this.transport.host.create(id);
	  peer.on('message', receive);

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	DistribusConnection.prototype.send = function (to, message) {
	  return this.transport.host.send(this.id, to, message);
	};

	/**
	 * Close the connection
	 */
	DistribusConnection.prototype.close = function () {
	  this.transport.host.remove(this.id);
	};

	module.exports = DistribusConnection;


/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var http = __webpack_require__(110);
	var Promise = __webpack_require__(2);
	var Transport = __webpack_require__(102);
	var HTTPConnection = __webpack_require__(111);
	var uuid = __webpack_require__(12);

	/**
	 * HTTP Transport layer:
	 *
	 * Supported Options:
	 *
	 * {Number}  config.port              Port to listen on.
	 * {String}  config.path              Path, with or without leading and trailing slash (/)
	 * {Boolean} config.localShortcut     If the agentId exists locally, use local transport. (local)
	 *
	 * Address: http://127.0.0.1:PORTNUMBER/PATH
	 */
	function HTTPTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = null;

	  this.agents = {};
	  this.outstandingRequests = {}; // these are received messages that are expecting a response
	  this.outstandingMessages = {};

	  this.url =  config && config.url || "http://127.0.0.1:3000/agents/:id";
	  this.remoteUrl =  config && config.remoteUrl;
	  this.localShortcut = (config && config.localShortcut === false) ? false : true;

	  this.httpTimeout =         config && config.httpTimeout         || 2000; // 1 second - timeout to send message
	  this.httpResponseTimeout = config && config.httpResponseTimeout || 200;  // 0.5 second - timeout to expect reply after delivering request
	  this.regexHosts = /[http]{4}s?:\/\/([a-z\-\.A-Z0-9]*):?([0-9]*)(\/[a-z\/:A-Z0-9._\-% \\\(\)\*\+\.\^\$]*)/;
	  this.urlHostData = this.regexHosts.exec(this.url);

	  this.regexPath = this.getRegEx(this.urlHostData[3]);
	  this.port = config && config.port || this.urlHostData[2] || 3000;
	  this.path = this.urlHostData[3].replace(':id', '');

	  if (typeof window !== 'undefined') {
	    this.send = this.webSend;
	  }
	}

	HTTPTransport.prototype = new Transport();
	HTTPTransport.prototype.type = 'http';

	HTTPTransport.prototype.getRegEx = function(url) {
	  return new RegExp(url.replace(/[\\\(\)\*\+\.\^\$]/g,function(match) {return '\\' + match;}).replace(':id','([:a-zA-Z_0-9\-]*)'));
	};

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {HTTPConnection}   Returns a connection.
	 */
	HTTPTransport.prototype.connect = function(id, receive) {
	  if (this.server === undefined && typeof window === 'undefined') {
	    this.initiateServer();
	  }
	  this.outstandingRequests[id] = {};
	  this.outstandingMessages[id] = {};
	  return new HTTPConnection(this, id, receive);
	};

	/**
	 * Send a message to an agent
	 * @param {String} from    Id of sender
	 * @param {String} to      Id of addressed peer
	 * @param {String} message
	 */
	HTTPTransport.prototype.send = function(from, to, message) {
	  var me = this;
	  return new Promise(function (resolve,reject) {
	    var hostData = me.regexHosts.exec(to);
	    var fromRegexpCheck = me.regexPath.exec(from);
	    var fromAgentId = fromRegexpCheck[1];
	    var outstandingMessageID = uuid();

	    // check for local shortcut possibility
	    if (me.localShortcut == true) {
	      var toRegexpCheck = me.regexPath.exec(to);
	      var toAgentId = toRegexpCheck[1];
	      var toPath = hostData[3].replace(toAgentId,"");

	      // check if the "to" address is on the same URL, port and path as the "from"
	      if ((hostData[1] == '127.0.0.1'       && hostData[2] == me.urlHostData[2] && toPath == me.path) ||
	          (me.urlHostData[1] == hostData[1] && hostData[2] == me.urlHostData[2] && toPath == me.path)) {
	        // by definition true but check anyway
	        if (me.agents[toAgentId] !== undefined) {
	          me.agents[toAgentId](fromAgentId, message);
	          resolve();
	          return;
	        }
	      }
	    }

	    // stringify the message. If the message is an object, it can have an ID so it may be part of a req/rep.
	    if (typeof message == 'object') {
	      // check if the send is a reply to an outstanding request and if so, deliver
	      var outstanding = me.outstandingRequests[fromAgentId];
	      if (outstanding[message.id] !== undefined) {
	        var callback = outstanding[message.id];
	        callback.response.end(JSON.stringify(message));
	        clearTimeout(callback.timeout);
	        delete outstanding[message.id];
	        resolve();
	        return;
	      }
	      // stringify the message.
	      message = JSON.stringify(message)
	    }

	    // all post options
	    var options = {
	      host: hostData[1],
	      port: hostData[2],
	      path: hostData[3],
	      method: 'POST',
	      headers: {
	        'x-eve-senderurl' : from, // used to get senderID
	        'Content-type'    : 'text/plain'
	      }
	    };
	    var request = http.request(options, function(res) {
	      res.setEncoding('utf8');
	      // message was delivered, clear the cannot deliver timeout.
	      clearTimeout(me.outstandingMessages[fromAgentId][outstandingMessageID].timeout);
	      // listen to incoming data
	      res.on('data', function (response) {
	        var parsedResponse;
	        try {parsedResponse = JSON.parse(response);} catch (err) {parsedResponse = response;}
	        if (typeof parsedResponse == 'object') {
	          if (parsedResponse.__httpError__ !== undefined) {
	            reject(new Error(parsedResponse.__httpError__));
	            return;
	          }
	        }
	        me.agents[fromAgentId](to, parsedResponse);
	        resolve();
	      });
	    });

	    me.outstandingMessages[fromAgentId][outstandingMessageID] = {
	      timeout: setTimeout(function () {
	        request.abort();
	        reject(new Error("Cannot connect to " + to))
	      }, me.httpTimeout),
	      reject: reject
	    };

	    request.on('error', function(e) {
	      reject(e);
	    });

	    // write data to request body
	    request.write(message);
	    request.end();
	  });
	};


	/**
	 * Send a request to an url. Only for web.
	 * @param {String} from    Id of sender
	 * @param {String} to      Id of addressed peer
	 * @param {String} message
	 */
	HTTPTransport.prototype.webSend = function(from, to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    if (typeof message == 'object') {
	      message = JSON.stringify(message);
	    }
	    var fromRegexpCheck = me.regexPath.exec(from);
	    var fromAgentId = fromRegexpCheck[1];
	    // create XMLHttpRequest object to send the POST request
	    var http = new XMLHttpRequest();

	    // insert the callback function. This is called when the message has been delivered and a response has been received
	    http.onreadystatechange = function () {
	      if (http.readyState == 4 && http.status == 200) {
	        var response = "";
	        if (http.responseText.length > 0) {
	          response = JSON.parse(http.responseText);
	        }
	        me.agents[fromAgentId](to, response);
	        // launch callback function
	        resolve();
	      }
	      else if (http.readyState == 4) {
	        reject(new Error("http.status:" + http.status));
	      }
	    };

	    // open an asynchronous POST connection
	    http.open("POST", to, true);
	    // include header so the receiving code knows its a JSON object
	    http.setRequestHeader("Content-Type", "text/plain");
	    // send
	    http.send(message);
	  });
	};


	/**
	 * This is the HTTP equivalent of receiveMessage.
	 *
	 * @param request
	 * @param response
	 */
	HTTPTransport.prototype.processRequest = function(request, response) {
	  var url = request.url;

	  // define headers
	  var headers = {};
	  headers['Access-Control-Allow-Origin'] = '*';
	  headers['Access-Control-Allow-Credentials'] = true;
	  headers['Content-Type'] = 'text/plain';

	  var regexpCheck = this.regexPath.exec(url);
	  if (regexpCheck !== null) {
	    var agentId = regexpCheck[1];
	    var senderId = 'unknown';
	    if (request.headers['x-eve-senderurl'] !== undefined) {
	      senderId = request.headers['x-eve-senderurl'];
	    }
	    var body = '';
	    request.on('data', function (data) {
	      body += data;
	      if (body.length > 30e6) {        // 30e6 == 30MB
	        request.connection.destroy(); // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
	      }
	    });


	    var me = this;
	    request.on('end', function () {
	      var expectReply = false;
	      var message;
	      try {message = JSON.parse(body);} catch (err) {message = body;}

	      // check if JSON RPC
	      expectReply = message.jsonrpc && message.jsonrpc == '2.0' || expectReply;
	      // check if type == 'request'
	      expectReply = message.type && message.type == 'request' || expectReply;

	      response.writeHead(200, headers);
	      // construct callback
	      var callback = me.agents[agentId];
	      if (callback === undefined) {
	        var error = new Error('Agent: "' + agentId + '" does not exist.');
	        response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
	      }
	      else {
	        if (expectReply == true) {
	          me.outstandingRequests[agentId][message.id] = {
	            response: response,
	            timeout: setTimeout(function () {
	              response.end("timeout");
	              delete me.outstandingRequests[agentId][message.id];
	            }, me.httpResponseTimeout)
	          };
	          callback(senderId, message);
	        }
	        else {
	          // if we're not expecting a response, we first close the connection, then receive the message
	          response.end('');
	          if (callback !== undefined) {
	            callback(senderId, message);
	          }
	        }
	      }
	    });
	  }
	};

	/**
	 *  Configure a HTTP server listener
	 */
	HTTPTransport.prototype.initiateServer = function() {
	  if (this.server === undefined) {
	    var me = this;
	    this.server = http.createServer(function (request, response) {
	      if (request.method == 'OPTIONS') {
	        var headers = {};
	        headers['Access-Control-Allow-Origin'] = '*';
	        headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
	        headers['Access-Control-Allow-Credentials'] = true;
	        headers['Access-Control-Max-Age'] = '86400'; // 24 hours
	        headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Access-Control-Allow-Origin, X-HTTP-Method-Override, Content-Type, Authorization, Accept';
	        // respond to the request
	        response.writeHead(200, headers);
	        response.end();
	      }
	      else if (request.method == 'POST') {
	        me.processRequest(request, response);
	      }
	    });

	    this.server.on('error', function(err) {
	      if (err.code == 'EADDRINUSE') {
	        throw new Error('ERROR: Could not start HTTP server. Port ' + me.port + ' is occupied.');
	      }
	      else {
	        throw new Error(err);
	      }
	    });

	    // Listen on port (default: 3000), IP defaults to 127.0.0.1
	    this.server.listen(this.port, function() {
	      // Put a friendly message on the terminal
	      console.log('Server listening at ', me.url);
	    });


	  }
	  else {
	    this.server.close();
	    this.server = undefined;
	    this.initiateServer();
	  }
	};


	/**
	 *  Close the HTTP server
	 */
	HTTPTransport.prototype.close = function() {
	  // close all open connections
	  for (var agentId in this.outstandingRequests) {
	    if (this.outstandingRequests.hasOwnProperty(agentId)) {
	      var agentRequests = this.outstandingRequests[agentId];
	      for (var messageId in agentRequests) {
	        if (agentRequests.hasOwnProperty(messageId)) {
	          var openMessage = agentRequests[messageId];
	          var error = new Error('Server shutting down.');
	          openMessage.response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
	        }
	      }
	    }
	  }
	  // close server
	  if (this.server) {
	    this.server.close();
	  }
	  this.server = null;
	};


	module.exports = HTTPTransport;



/***/ },
/* 110 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_110__;

/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var Connection = __webpack_require__(105);

	/**
	 * A HTTP connection.
	 * @param {HTTPTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function HTTPConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // register the agents receive function
	  if (this.id in this.transport.agents) {
	    throw new Error('Agent with id ' + id + ' already exists');
	  }
	  this.transport.agents[this.id] = receive;

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 */
	HTTPConnection.prototype.send = function (to, message) {
	  var fromURL = this.transport.url.replace(':id', this.id);

	  var isURL = to.indexOf('://') !== -1;
	  var toURL;
	  if (isURL) {
	    toURL = to;
	  }
	  else {
	    if (this.transport.remoteUrl !== undefined) {
	      toURL = this.transport.remoteUrl.replace(':id', to);
	    }
	    else {
	      console.log('ERROR: no remote URL specified. Cannot send over HTTP.', to);
	    }
	  }

	  return this.transport.send(fromURL, toURL, message);
	};

	/**
	 * Close the connection
	 */
	HTTPConnection.prototype.close = function () {
	  delete this.transport.agents[this.id];
	};

	module.exports = HTTPConnection;


/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Transport = __webpack_require__(102);
	var LocalConnection = __webpack_require__(113);

	/**
	 * Create a local transport.
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 * @constructor
	 */
	function LocalTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = this.id || null;
	  this['default'] = config && config['default'] || false;
	  this.agents = {};
	}

	LocalTransport.prototype = new Transport();

	LocalTransport.prototype.type = 'local';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive                  Invoked as receive(from, message)
	 * @return {LocalConnection} Returns a promise which resolves when
	 *                                                connected.
	 */
	LocalTransport.prototype.connect = function(id, receive) {
	  return new LocalConnection(this, id, receive);
	};

	/**
	 * Close the transport. Removes all agent connections.
	 */
	LocalTransport.prototype.close = function() {
	  this.agents = {};
	};

	module.exports = LocalTransport;


/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var Connection = __webpack_require__(105);

	/**
	 * A local connection.
	 * @param {LocalTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function LocalConnection(transport, id, receive) {
	  this.transport = transport;
	  this.id = id;

	  // register the agents receive function
	  if (this.id in this.transport.agents) {
	    throw new Error('Agent with id ' + id + ' already exists');
	  }
	  this.transport.agents[this.id] = receive;

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	LocalConnection.prototype.send = function (to, message) {
	  var callback = this.transport.agents[to];
	  if (!callback) {
	    return Promise.reject(new Error('Agent with id ' + to + ' not found'));
	  }

	  // invoke the agents receiver as callback(from, message)
	  callback(this.id, message);

	  return Promise.resolve();
	};

	/**
	 * Close the connection
	 */
	LocalConnection.prototype.close = function () {
	  delete this.transport.agents[this.id];
	};

	module.exports = LocalConnection;


/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Transport = __webpack_require__(102);
	var PubNubConnection = __webpack_require__(115);

	/**
	 * Use pubnub as transport
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `publish_key: string`. Required
	 *                                - `subscribe_key: string`. Required
	 * @constructor
	 */
	function PubNubTransport(config) {
	  this.id = config.id || null;
	  this.networkId = config.publish_key || null;
	  this['default'] = config['default'] || false;
	  this.pubnub = PUBNUB().init(config);
	}

	PubNubTransport.prototype = new Transport();

	PubNubTransport.prototype.type = 'pubnub';

	/**
	 * Connect an agent
	 * @param {String} id
	 * @param {Function} receive  Invoked as receive(from, message)
	 * @return {PubNubConnection} Returns a connection
	 */
	PubNubTransport.prototype.connect = function(id, receive) {
	  return new PubNubConnection(this, id, receive)
	};

	/**
	 * Close the transport.
	 */
	PubNubTransport.prototype.close = function() {
	  // FIXME: how to correctly close a pubnub connection?
	  this.pubnub = null;
	};

	/**
	 * Load the PubNub library
	 * @returns {Object} PUBNUB
	 */
	function PUBNUB() {
	  if (typeof window !== 'undefined') {
	    // browser
	    if (typeof window['PUBNUB'] === 'undefined') {
	      throw new Error('Please load pubnub first in the browser');
	    }
	    return window['PUBNUB'];
	  }
	  else {
	    // node.js
	    return __webpack_require__(90);
	  }
	}

	module.exports = PubNubTransport;


/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var Promise = __webpack_require__(2);
	var Connection = __webpack_require__(105);

	/**
	 * A connection. The connection is ready when the property .ready resolves.
	 * @param {PubNubTransport} transport
	 * @param {string | number} id
	 * @param {function} receive
	 * @constructor
	 */
	function PubNubConnection(transport, id, receive) {
	  this.id = id;
	  this.transport = transport;

	  // ready state
	  var me = this;
	  this.ready = new Promise(function (resolve, reject) {
	    transport.pubnub.subscribe({
	      channel: id,
	      message: function (message) {
	        receive(message.from, message.message);
	      },
	      connect: function () {
	        resolve(me);
	      }
	    });
	  });
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to
	 * @param {*} message
	 * @return {Promise} returns a promise which resolves when the message has been sent
	 */
	PubNubConnection.prototype.send = function (to, message) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    me.transport.pubnub.publish({
	      channel: to,
	      message: {
	        from: me.id,
	        to: to,
	        message: message
	      },
	      callback: resolve,
	      error: reject
	    });
	  });
	};

	/**
	 * Close the connection
	 */
	PubNubConnection.prototype.close = function () {
	  this.transport.pubnub.unsubscribe({
	    channel: this.id
	  });
	};

	module.exports = PubNubConnection;


/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var urlModule = __webpack_require__(117);
	var uuid = __webpack_require__(12);
	var Promise = __webpack_require__(2);

	var util = __webpack_require__(13);
	var Transport = __webpack_require__(102);
	var WebSocketConnection = __webpack_require__(122);

	/**
	 * Create a web socket transport.
	 * @param {Object} config         Config can contain the following properties:
	 *                                - `id: string`. Optional
	 *                                - `default: boolean`. Optional
	 *                                - `url: string`. Optional. If provided,
	 *                                  A WebSocket server is started on given
	 *                                  url.
	 *                                - `localShortcut: boolean`. Optional. If true
	 *                                  (default), messages to local agents are not
	 *                                  send via WebSocket but delivered immediately
	 *                                - `reconnectDelay: number` Optional. Delay in
	 *                                  milliseconds for reconnecting a broken
	 *                                  connection. 10000 ms by default. Connections
	 *                                  are only automatically reconnected after
	 *                                  there has been an established connection.
	 * @constructor
	 */
	function WebSocketTransport(config) {
	  this.id = config && config.id || null;
	  this.networkId = this.id || null;
	  this['default'] = config && config['default'] || false;
	  this.localShortcut = (config && config.localShortcut === false) ? false : true;
	  this.reconnectDelay = config && config.reconnectDelay || 10000;

	  this.httpTransport = config && config.httpTransport;

	  this.url = config && config.url || null;
	  this.server = null;

	  if (this.url != null) {
	    var urlParts = urlModule.parse(this.url);

	    if (urlParts.protocol != 'ws:') throw new Error('Invalid protocol, "ws:" expected');
	    if (this.url.indexOf(':id') == -1) throw new Error('":id" placeholder missing in url');

	    this.address = urlParts.protocol + '//' + urlParts.host; // the url without path, for example 'ws://localhost:3000'
	    this.ready = this._initServer(this.url);
	  }
	  else {
	    this.address = null;
	    this.ready = Promise.resolve(this);
	  }

	  this.agents = {}; // WebSocketConnections of all registered agents. The keys are the urls of the agents
	}

	WebSocketTransport.prototype = new Transport();

	WebSocketTransport.prototype.type = 'ws';

	/**
	 * Build an url for given id. Example:
	 *   var url = getUrl('agent1'); // 'ws://localhost:3000/agents/agent1'
	 * @param {String} id
	 * @return {String} Returns the url, or returns null when no url placeholder
	 *                  is defined.
	 */
	WebSocketTransport.prototype.getUrl = function (id) {
	  return this.url ? this.url.replace(':id', id) : null;
	};

	/**
	 * Initialize a server on given url
	 * @param {String} url    For example 'http://localhost:3000'
	 * @return {Promise} Returns a promise which resolves when the server is up
	 *                   and running
	 * @private
	 */
	WebSocketTransport.prototype._initServer = function (url) {
	  // require ws dependency here, not on top of the file, as `ws` is excluded
	  // in the browser bundle
	  var WebSocketServer = __webpack_require__(37).Server;

	  var urlParts = urlModule.parse(url);
	  var port = urlParts.port || 80;

	  var me = this;
	  return new Promise(function (resolve, reject) {
	    if (me.httpTransport !== undefined) {
	      console.log("WEBSOCKETS: using available server.");
	      me.server = new WebSocketServer({server: me.httpTransport.server}, function () {
	        resolve(me);
	      });
	    }
	    else {
	      me.server = new WebSocketServer({port: port}, function () {
	        resolve(me);
	      });
	    }


	    me.server.on('connection', me._onConnection.bind(me));

	    me.server.on('error', function (err) {
	      reject(err)
	    });
	  })
	};

	/**
	 * Handle a new connection. The connection is added to the addressed agent.
	 * @param {WebSocket} conn
	 * @private
	 */
	WebSocketTransport.prototype._onConnection = function (conn) {
	  var url = conn.upgradeReq.url;
	  var urlParts = urlModule.parse(url, true);
	  var toPath = urlParts.pathname;
	  var to = util.normalizeURL(this.address + toPath);

	  // read sender id from query parameters or generate a random uuid
	  var queryParams = urlParts.query;
	  var from = queryParams.id || uuid();
	  // TODO: make a config option to allow/disallow anonymous connections?
	  //console.log('onConnection, to=', to, ', from=', from, ', agents:', Object.keys(this.agents)); // TODO: cleanup

	  var agent = this.agents[to];
	  if (agent) {
	    agent._onConnection(from, conn);
	  }
	  else {
	    // reject the connection
	    // conn.send('Error: Agent with id "' + to + '" not found'); // TODO: can we send back a message before closing?
	    conn.close();
	  }
	};

	/**
	 * Connect an agent
	 * @param {string} id     The id or url of the agent. In case of an
	 *                        url, this url should match the url of the
	 *                        WebSocket server.
	 * @param {Function} receive                  Invoked as receive(from, message)
	 * @return {WebSocketConnection} Returns a promise which resolves when
	 *                                                connected.
	 */
	WebSocketTransport.prototype.connect = function(id, receive) {
	  var isURL = (id.indexOf('://') !== -1);

	  // FIXME: it's confusing right now what the final url will be based on the provided id...
	  var url = isURL ? id : (this.getUrl(id) || id);
	  if (url) url = util.normalizeURL(url);

	  // register the agents receive function
	  if (this.agents[url]) {
	    throw new Error('Agent with id ' + this.id + ' already exists');
	  }

	  var conn = new WebSocketConnection(this, url, receive);
	  this.agents[conn.url] = conn; // use conn.url, url can be changed when it was null

	  return conn;
	};

	/**
	 * Close the transport. Removes all agent connections.
	 */
	WebSocketTransport.prototype.close = function() {
	  // close all connections
	  for (var id in this.agents) {
	    if (this.agents.hasOwnProperty(id)) {
	      this.agents[id].close();
	    }
	  }
	  this.agents = {};

	  // close the server
	  if (this.server) {
	    this.server.close();
	  }
	};

	module.exports = WebSocketTransport;


/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	var punycode = __webpack_require__(118);

	exports.parse = urlParse;
	exports.resolve = urlResolve;
	exports.resolveObject = urlResolveObject;
	exports.format = urlFormat;

	exports.Url = Url;

	function Url() {
	  this.protocol = null;
	  this.slashes = null;
	  this.auth = null;
	  this.host = null;
	  this.port = null;
	  this.hostname = null;
	  this.hash = null;
	  this.search = null;
	  this.query = null;
	  this.pathname = null;
	  this.path = null;
	  this.href = null;
	}

	// Reference: RFC 3986, RFC 1808, RFC 2396

	// define these here so at least they only have to be
	// compiled once on the first module load.
	var protocolPattern = /^([a-z0-9.+-]+:)/i,
	    portPattern = /:[0-9]*$/,

	    // RFC 2396: characters reserved for delimiting URLs.
	    // We actually just auto-escape these.
	    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

	    // RFC 2396: characters not allowed for various reasons.
	    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

	    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
	    autoEscape = ['\''].concat(unwise),
	    // Characters that are never ever allowed in a hostname.
	    // Note that any invalid chars are also handled, but these
	    // are the ones that are *expected* to be seen, so we fast-path
	    // them.
	    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
	    hostEndingChars = ['/', '?', '#'],
	    hostnameMaxLen = 255,
	    hostnamePartPattern = /^[a-z0-9A-Z_-]{0,63}$/,
	    hostnamePartStart = /^([a-z0-9A-Z_-]{0,63})(.*)$/,
	    // protocols that can allow "unsafe" and "unwise" chars.
	    unsafeProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that never have a hostname.
	    hostlessProtocol = {
	      'javascript': true,
	      'javascript:': true
	    },
	    // protocols that always contain a // bit.
	    slashedProtocol = {
	      'http': true,
	      'https': true,
	      'ftp': true,
	      'gopher': true,
	      'file': true,
	      'http:': true,
	      'https:': true,
	      'ftp:': true,
	      'gopher:': true,
	      'file:': true
	    },
	    querystring = __webpack_require__(119);

	function urlParse(url, parseQueryString, slashesDenoteHost) {
	  if (url && isObject(url) && url instanceof Url) return url;

	  var u = new Url;
	  u.parse(url, parseQueryString, slashesDenoteHost);
	  return u;
	}

	Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
	  if (!isString(url)) {
	    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
	  }

	  var rest = url;

	  // trim before proceeding.
	  // This is to support parse stuff like "  http://foo.com  \n"
	  rest = rest.trim();

	  var proto = protocolPattern.exec(rest);
	  if (proto) {
	    proto = proto[0];
	    var lowerProto = proto.toLowerCase();
	    this.protocol = lowerProto;
	    rest = rest.substr(proto.length);
	  }

	  // figure out if it's got a host
	  // user@server is *always* interpreted as a hostname, and url
	  // resolution will treat //foo/bar as host=foo,path=bar because that's
	  // how the browser resolves relative URLs.
	  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
	    var slashes = rest.substr(0, 2) === '//';
	    if (slashes && !(proto && hostlessProtocol[proto])) {
	      rest = rest.substr(2);
	      this.slashes = true;
	    }
	  }

	  if (!hostlessProtocol[proto] &&
	      (slashes || (proto && !slashedProtocol[proto]))) {

	    // there's a hostname.
	    // the first instance of /, ?, ;, or # ends the host.
	    //
	    // If there is an @ in the hostname, then non-host chars *are* allowed
	    // to the left of the last @ sign, unless some host-ending character
	    // comes *before* the @-sign.
	    // URLs are obnoxious.
	    //
	    // ex:
	    // http://a@b@c/ => user:a@b host:c
	    // http://a@b?@c => user:a host:c path:/?@c

	    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
	    // Review our test case against browsers more comprehensively.

	    // find the first instance of any hostEndingChars
	    var hostEnd = -1;
	    for (var i = 0; i < hostEndingChars.length; i++) {
	      var hec = rest.indexOf(hostEndingChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }

	    // at this point, either we have an explicit point where the
	    // auth portion cannot go past, or the last @ char is the decider.
	    var auth, atSign;
	    if (hostEnd === -1) {
	      // atSign can be anywhere.
	      atSign = rest.lastIndexOf('@');
	    } else {
	      // atSign must be in auth portion.
	      // http://a@b/c@d => host:b auth:a path:/c@d
	      atSign = rest.lastIndexOf('@', hostEnd);
	    }

	    // Now we have a portion which is definitely the auth.
	    // Pull that off.
	    if (atSign !== -1) {
	      auth = rest.slice(0, atSign);
	      rest = rest.slice(atSign + 1);
	      this.auth = decodeURIComponent(auth);
	    }

	    // the host is the remaining to the left of the first non-host char
	    hostEnd = -1;
	    for (var i = 0; i < nonHostChars.length; i++) {
	      var hec = rest.indexOf(nonHostChars[i]);
	      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
	        hostEnd = hec;
	    }
	    // if we still have not hit it, then the entire thing is a host.
	    if (hostEnd === -1)
	      hostEnd = rest.length;

	    this.host = rest.slice(0, hostEnd);
	    rest = rest.slice(hostEnd);

	    // pull out port.
	    this.parseHost();

	    // we've indicated that there is a hostname,
	    // so even if it's empty, it has to be present.
	    this.hostname = this.hostname || '';

	    // if hostname begins with [ and ends with ]
	    // assume that it's an IPv6 address.
	    var ipv6Hostname = this.hostname[0] === '[' &&
	        this.hostname[this.hostname.length - 1] === ']';

	    // validate a little.
	    if (!ipv6Hostname) {
	      var hostparts = this.hostname.split(/\./);
	      for (var i = 0, l = hostparts.length; i < l; i++) {
	        var part = hostparts[i];
	        if (!part) continue;
	        if (!part.match(hostnamePartPattern)) {
	          var newpart = '';
	          for (var j = 0, k = part.length; j < k; j++) {
	            if (part.charCodeAt(j) > 127) {
	              // we replace non-ASCII char with a temporary placeholder
	              // we need this to make sure size of hostname is not
	              // broken by replacing non-ASCII by nothing
	              newpart += 'x';
	            } else {
	              newpart += part[j];
	            }
	          }
	          // we test again with ASCII char only
	          if (!newpart.match(hostnamePartPattern)) {
	            var validParts = hostparts.slice(0, i);
	            var notHost = hostparts.slice(i + 1);
	            var bit = part.match(hostnamePartStart);
	            if (bit) {
	              validParts.push(bit[1]);
	              notHost.unshift(bit[2]);
	            }
	            if (notHost.length) {
	              rest = '/' + notHost.join('.') + rest;
	            }
	            this.hostname = validParts.join('.');
	            break;
	          }
	        }
	      }
	    }

	    if (this.hostname.length > hostnameMaxLen) {
	      this.hostname = '';
	    } else {
	      // hostnames are always lower case.
	      this.hostname = this.hostname.toLowerCase();
	    }

	    if (!ipv6Hostname) {
	      // IDNA Support: Returns a puny coded representation of "domain".
	      // It only converts the part of the domain name that
	      // has non ASCII characters. I.e. it dosent matter if
	      // you call it with a domain that already is in ASCII.
	      var domainArray = this.hostname.split('.');
	      var newOut = [];
	      for (var i = 0; i < domainArray.length; ++i) {
	        var s = domainArray[i];
	        newOut.push(s.match(/[^A-Za-z0-9_-]/) ?
	            'xn--' + punycode.encode(s) : s);
	      }
	      this.hostname = newOut.join('.');
	    }

	    var p = this.port ? ':' + this.port : '';
	    var h = this.hostname || '';
	    this.host = h + p;
	    this.href += this.host;

	    // strip [ and ] from the hostname
	    // the host field still retains them, though
	    if (ipv6Hostname) {
	      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
	      if (rest[0] !== '/') {
	        rest = '/' + rest;
	      }
	    }
	  }

	  // now rest is set to the post-host stuff.
	  // chop off any delim chars.
	  if (!unsafeProtocol[lowerProto]) {

	    // First, make 100% sure that any "autoEscape" chars get
	    // escaped, even if encodeURIComponent doesn't think they
	    // need to be.
	    for (var i = 0, l = autoEscape.length; i < l; i++) {
	      var ae = autoEscape[i];
	      var esc = encodeURIComponent(ae);
	      if (esc === ae) {
	        esc = escape(ae);
	      }
	      rest = rest.split(ae).join(esc);
	    }
	  }


	  // chop off from the tail first.
	  var hash = rest.indexOf('#');
	  if (hash !== -1) {
	    // got a fragment string.
	    this.hash = rest.substr(hash);
	    rest = rest.slice(0, hash);
	  }
	  var qm = rest.indexOf('?');
	  if (qm !== -1) {
	    this.search = rest.substr(qm);
	    this.query = rest.substr(qm + 1);
	    if (parseQueryString) {
	      this.query = querystring.parse(this.query);
	    }
	    rest = rest.slice(0, qm);
	  } else if (parseQueryString) {
	    // no query string, but parseQueryString still requested
	    this.search = '';
	    this.query = {};
	  }
	  if (rest) this.pathname = rest;
	  if (slashedProtocol[lowerProto] &&
	      this.hostname && !this.pathname) {
	    this.pathname = '/';
	  }

	  //to support http.request
	  if (this.pathname || this.search) {
	    var p = this.pathname || '';
	    var s = this.search || '';
	    this.path = p + s;
	  }

	  // finally, reconstruct the href based on what has been validated.
	  this.href = this.format();
	  return this;
	};

	// format a parsed object into a url string
	function urlFormat(obj) {
	  // ensure it's an object, and not a string url.
	  // If it's an obj, this is a no-op.
	  // this way, you can call url_format() on strings
	  // to clean up potentially wonky urls.
	  if (isString(obj)) obj = urlParse(obj);
	  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
	  return obj.format();
	}

	Url.prototype.format = function() {
	  var auth = this.auth || '';
	  if (auth) {
	    auth = encodeURIComponent(auth);
	    auth = auth.replace(/%3A/i, ':');
	    auth += '@';
	  }

	  var protocol = this.protocol || '',
	      pathname = this.pathname || '',
	      hash = this.hash || '',
	      host = false,
	      query = '';

	  if (this.host) {
	    host = auth + this.host;
	  } else if (this.hostname) {
	    host = auth + (this.hostname.indexOf(':') === -1 ?
	        this.hostname :
	        '[' + this.hostname + ']');
	    if (this.port) {
	      host += ':' + this.port;
	    }
	  }

	  if (this.query &&
	      isObject(this.query) &&
	      Object.keys(this.query).length) {
	    query = querystring.stringify(this.query);
	  }

	  var search = this.search || (query && ('?' + query)) || '';

	  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

	  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
	  // unless they had them to begin with.
	  if (this.slashes ||
	      (!protocol || slashedProtocol[protocol]) && host !== false) {
	    host = '//' + (host || '');
	    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
	  } else if (!host) {
	    host = '';
	  }

	  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
	  if (search && search.charAt(0) !== '?') search = '?' + search;

	  pathname = pathname.replace(/[?#]/g, function(match) {
	    return encodeURIComponent(match);
	  });
	  search = search.replace('#', '%23');

	  return protocol + host + pathname + search + hash;
	};

	function urlResolve(source, relative) {
	  return urlParse(source, false, true).resolve(relative);
	}

	Url.prototype.resolve = function(relative) {
	  return this.resolveObject(urlParse(relative, false, true)).format();
	};

	function urlResolveObject(source, relative) {
	  if (!source) return relative;
	  return urlParse(source, false, true).resolveObject(relative);
	}

	Url.prototype.resolveObject = function(relative) {
	  if (isString(relative)) {
	    var rel = new Url();
	    rel.parse(relative, false, true);
	    relative = rel;
	  }

	  var result = new Url();
	  Object.keys(this).forEach(function(k) {
	    result[k] = this[k];
	  }, this);

	  // hash is always overridden, no matter what.
	  // even href="" will remove it.
	  result.hash = relative.hash;

	  // if the relative url is empty, then there's nothing left to do here.
	  if (relative.href === '') {
	    result.href = result.format();
	    return result;
	  }

	  // hrefs like //foo/bar always cut to the protocol.
	  if (relative.slashes && !relative.protocol) {
	    // take everything except the protocol from relative
	    Object.keys(relative).forEach(function(k) {
	      if (k !== 'protocol')
	        result[k] = relative[k];
	    });

	    //urlParse appends trailing / to urls like http://www.example.com
	    if (slashedProtocol[result.protocol] &&
	        result.hostname && !result.pathname) {
	      result.path = result.pathname = '/';
	    }

	    result.href = result.format();
	    return result;
	  }

	  if (relative.protocol && relative.protocol !== result.protocol) {
	    // if it's a known url protocol, then changing
	    // the protocol does weird things
	    // first, if it's not file:, then we MUST have a host,
	    // and if there was a path
	    // to begin with, then we MUST have a path.
	    // if it is file:, then the host is dropped,
	    // because that's known to be hostless.
	    // anything else is assumed to be absolute.
	    if (!slashedProtocol[relative.protocol]) {
	      Object.keys(relative).forEach(function(k) {
	        result[k] = relative[k];
	      });
	      result.href = result.format();
	      return result;
	    }

	    result.protocol = relative.protocol;
	    if (!relative.host && !hostlessProtocol[relative.protocol]) {
	      var relPath = (relative.pathname || '').split('/');
	      while (relPath.length && !(relative.host = relPath.shift()));
	      if (!relative.host) relative.host = '';
	      if (!relative.hostname) relative.hostname = '';
	      if (relPath[0] !== '') relPath.unshift('');
	      if (relPath.length < 2) relPath.unshift('');
	      result.pathname = relPath.join('/');
	    } else {
	      result.pathname = relative.pathname;
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    result.host = relative.host || '';
	    result.auth = relative.auth;
	    result.hostname = relative.hostname || relative.host;
	    result.port = relative.port;
	    // to support http.request
	    if (result.pathname || result.search) {
	      var p = result.pathname || '';
	      var s = result.search || '';
	      result.path = p + s;
	    }
	    result.slashes = result.slashes || relative.slashes;
	    result.href = result.format();
	    return result;
	  }

	  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
	      isRelAbs = (
	          relative.host ||
	          relative.pathname && relative.pathname.charAt(0) === '/'
	      ),
	      mustEndAbs = (isRelAbs || isSourceAbs ||
	                    (result.host && relative.pathname)),
	      removeAllDots = mustEndAbs,
	      srcPath = result.pathname && result.pathname.split('/') || [],
	      relPath = relative.pathname && relative.pathname.split('/') || [],
	      psychotic = result.protocol && !slashedProtocol[result.protocol];

	  // if the url is a non-slashed url, then relative
	  // links like ../.. should be able
	  // to crawl up to the hostname, as well.  This is strange.
	  // result.protocol has already been set by now.
	  // Later on, put the first path part into the host field.
	  if (psychotic) {
	    result.hostname = '';
	    result.port = null;
	    if (result.host) {
	      if (srcPath[0] === '') srcPath[0] = result.host;
	      else srcPath.unshift(result.host);
	    }
	    result.host = '';
	    if (relative.protocol) {
	      relative.hostname = null;
	      relative.port = null;
	      if (relative.host) {
	        if (relPath[0] === '') relPath[0] = relative.host;
	        else relPath.unshift(relative.host);
	      }
	      relative.host = null;
	    }
	    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
	  }

	  if (isRelAbs) {
	    // it's absolute.
	    result.host = (relative.host || relative.host === '') ?
	                  relative.host : result.host;
	    result.hostname = (relative.hostname || relative.hostname === '') ?
	                      relative.hostname : result.hostname;
	    result.search = relative.search;
	    result.query = relative.query;
	    srcPath = relPath;
	    // fall through to the dot-handling below.
	  } else if (relPath.length) {
	    // it's relative
	    // throw away the existing file, and take the new path instead.
	    if (!srcPath) srcPath = [];
	    srcPath.pop();
	    srcPath = srcPath.concat(relPath);
	    result.search = relative.search;
	    result.query = relative.query;
	  } else if (!isNullOrUndefined(relative.search)) {
	    // just pull out the search.
	    // like href='?foo'.
	    // Put this after the other two cases because it simplifies the booleans
	    if (psychotic) {
	      result.hostname = result.host = srcPath.shift();
	      //occationaly the auth can get stuck only in host
	      //this especialy happens in cases like
	      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	      var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                       result.host.split('@') : false;
	      if (authInHost) {
	        result.auth = authInHost.shift();
	        result.host = result.hostname = authInHost.shift();
	      }
	    }
	    result.search = relative.search;
	    result.query = relative.query;
	    //to support http.request
	    if (!isNull(result.pathname) || !isNull(result.search)) {
	      result.path = (result.pathname ? result.pathname : '') +
	                    (result.search ? result.search : '');
	    }
	    result.href = result.format();
	    return result;
	  }

	  if (!srcPath.length) {
	    // no path at all.  easy.
	    // we've already handled the other stuff above.
	    result.pathname = null;
	    //to support http.request
	    if (result.search) {
	      result.path = '/' + result.search;
	    } else {
	      result.path = null;
	    }
	    result.href = result.format();
	    return result;
	  }

	  // if a url ENDs in . or .., then it must get a trailing slash.
	  // however, if it ends in anything else non-slashy,
	  // then it must NOT get a trailing slash.
	  var last = srcPath.slice(-1)[0];
	  var hasTrailingSlash = (
	      (result.host || relative.host) && (last === '.' || last === '..') ||
	      last === '');

	  // strip single dots, resolve double dots to parent dir
	  // if the path tries to go above the root, `up` ends up > 0
	  var up = 0;
	  for (var i = srcPath.length; i >= 0; i--) {
	    last = srcPath[i];
	    if (last == '.') {
	      srcPath.splice(i, 1);
	    } else if (last === '..') {
	      srcPath.splice(i, 1);
	      up++;
	    } else if (up) {
	      srcPath.splice(i, 1);
	      up--;
	    }
	  }

	  // if the path is allowed to go above the root, restore leading ..s
	  if (!mustEndAbs && !removeAllDots) {
	    for (; up--; up) {
	      srcPath.unshift('..');
	    }
	  }

	  if (mustEndAbs && srcPath[0] !== '' &&
	      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
	    srcPath.unshift('');
	  }

	  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
	    srcPath.push('');
	  }

	  var isAbsolute = srcPath[0] === '' ||
	      (srcPath[0] && srcPath[0].charAt(0) === '/');

	  // put the host back
	  if (psychotic) {
	    result.hostname = result.host = isAbsolute ? '' :
	                                    srcPath.length ? srcPath.shift() : '';
	    //occationaly the auth can get stuck only in host
	    //this especialy happens in cases like
	    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
	    var authInHost = result.host && result.host.indexOf('@') > 0 ?
	                     result.host.split('@') : false;
	    if (authInHost) {
	      result.auth = authInHost.shift();
	      result.host = result.hostname = authInHost.shift();
	    }
	  }

	  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

	  if (mustEndAbs && !isAbsolute) {
	    srcPath.unshift('');
	  }

	  if (!srcPath.length) {
	    result.pathname = null;
	    result.path = null;
	  } else {
	    result.pathname = srcPath.join('/');
	  }

	  //to support request.http
	  if (!isNull(result.pathname) || !isNull(result.search)) {
	    result.path = (result.pathname ? result.pathname : '') +
	                  (result.search ? result.search : '');
	  }
	  result.auth = relative.auth || result.auth;
	  result.slashes = result.slashes || relative.slashes;
	  result.href = result.format();
	  return result;
	};

	Url.prototype.parseHost = function() {
	  var host = this.host;
	  var port = portPattern.exec(host);
	  if (port) {
	    port = port[0];
	    if (port !== ':') {
	      this.port = port.substr(1);
	    }
	    host = host.substr(0, host.length - port.length);
	  }
	  if (host) this.hostname = host;
	};

	function isString(arg) {
	  return typeof arg === "string";
	}

	function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	}

	function isNull(arg) {
	  return arg === null;
	}
	function isNullOrUndefined(arg) {
	  return  arg == null;
	}


/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! https://mths.be/punycode v1.3.2 by @mathias */
	;(function(root) {

		/** Detect free variables */
		var freeExports = typeof exports == 'object' && exports &&
			!exports.nodeType && exports;
		var freeModule = typeof module == 'object' && module &&
			!module.nodeType && module;
		var freeGlobal = typeof global == 'object' && global;
		if (
			freeGlobal.global === freeGlobal ||
			freeGlobal.window === freeGlobal ||
			freeGlobal.self === freeGlobal
		) {
			root = freeGlobal;
		}

		/**
		 * The `punycode` object.
		 * @name punycode
		 * @type Object
		 */
		var punycode,

		/** Highest positive signed 32-bit float value */
		maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

		/** Bootstring parameters */
		base = 36,
		tMin = 1,
		tMax = 26,
		skew = 38,
		damp = 700,
		initialBias = 72,
		initialN = 128, // 0x80
		delimiter = '-', // '\x2D'

		/** Regular expressions */
		regexPunycode = /^xn--/,
		regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
		regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

		/** Error messages */
		errors = {
			'overflow': 'Overflow: input needs wider integers to process',
			'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
			'invalid-input': 'Invalid input'
		},

		/** Convenience shortcuts */
		baseMinusTMin = base - tMin,
		floor = Math.floor,
		stringFromCharCode = String.fromCharCode,

		/** Temporary variable */
		key;

		/*--------------------------------------------------------------------------*/

		/**
		 * A generic error utility function.
		 * @private
		 * @param {String} type The error type.
		 * @returns {Error} Throws a `RangeError` with the applicable error message.
		 */
		function error(type) {
			throw RangeError(errors[type]);
		}

		/**
		 * A generic `Array#map` utility function.
		 * @private
		 * @param {Array} array The array to iterate over.
		 * @param {Function} callback The function that gets called for every array
		 * item.
		 * @returns {Array} A new array of values returned by the callback function.
		 */
		function map(array, fn) {
			var length = array.length;
			var result = [];
			while (length--) {
				result[length] = fn(array[length]);
			}
			return result;
		}

		/**
		 * A simple `Array#map`-like wrapper to work with domain name strings or email
		 * addresses.
		 * @private
		 * @param {String} domain The domain name or email address.
		 * @param {Function} callback The function that gets called for every
		 * character.
		 * @returns {Array} A new string of characters returned by the callback
		 * function.
		 */
		function mapDomain(string, fn) {
			var parts = string.split('@');
			var result = '';
			if (parts.length > 1) {
				// In email addresses, only the domain name should be punycoded. Leave
				// the local part (i.e. everything up to `@`) intact.
				result = parts[0] + '@';
				string = parts[1];
			}
			// Avoid `split(regex)` for IE8 compatibility. See #17.
			string = string.replace(regexSeparators, '\x2E');
			var labels = string.split('.');
			var encoded = map(labels, fn).join('.');
			return result + encoded;
		}

		/**
		 * Creates an array containing the numeric code points of each Unicode
		 * character in the string. While JavaScript uses UCS-2 internally,
		 * this function will convert a pair of surrogate halves (each of which
		 * UCS-2 exposes as separate characters) into a single code point,
		 * matching UTF-16.
		 * @see `punycode.ucs2.encode`
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode.ucs2
		 * @name decode
		 * @param {String} string The Unicode input string (UCS-2).
		 * @returns {Array} The new array of code points.
		 */
		function ucs2decode(string) {
			var output = [],
			    counter = 0,
			    length = string.length,
			    value,
			    extra;
			while (counter < length) {
				value = string.charCodeAt(counter++);
				if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
					// high surrogate, and there is a next character
					extra = string.charCodeAt(counter++);
					if ((extra & 0xFC00) == 0xDC00) { // low surrogate
						output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
					} else {
						// unmatched surrogate; only append this code unit, in case the next
						// code unit is the high surrogate of a surrogate pair
						output.push(value);
						counter--;
					}
				} else {
					output.push(value);
				}
			}
			return output;
		}

		/**
		 * Creates a string based on an array of numeric code points.
		 * @see `punycode.ucs2.decode`
		 * @memberOf punycode.ucs2
		 * @name encode
		 * @param {Array} codePoints The array of numeric code points.
		 * @returns {String} The new Unicode string (UCS-2).
		 */
		function ucs2encode(array) {
			return map(array, function(value) {
				var output = '';
				if (value > 0xFFFF) {
					value -= 0x10000;
					output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
					value = 0xDC00 | value & 0x3FF;
				}
				output += stringFromCharCode(value);
				return output;
			}).join('');
		}

		/**
		 * Converts a basic code point into a digit/integer.
		 * @see `digitToBasic()`
		 * @private
		 * @param {Number} codePoint The basic numeric code point value.
		 * @returns {Number} The numeric value of a basic code point (for use in
		 * representing integers) in the range `0` to `base - 1`, or `base` if
		 * the code point does not represent a value.
		 */
		function basicToDigit(codePoint) {
			if (codePoint - 48 < 10) {
				return codePoint - 22;
			}
			if (codePoint - 65 < 26) {
				return codePoint - 65;
			}
			if (codePoint - 97 < 26) {
				return codePoint - 97;
			}
			return base;
		}

		/**
		 * Converts a digit/integer into a basic code point.
		 * @see `basicToDigit()`
		 * @private
		 * @param {Number} digit The numeric value of a basic code point.
		 * @returns {Number} The basic code point whose value (when used for
		 * representing integers) is `digit`, which needs to be in the range
		 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
		 * used; else, the lowercase form is used. The behavior is undefined
		 * if `flag` is non-zero and `digit` has no uppercase form.
		 */
		function digitToBasic(digit, flag) {
			//  0..25 map to ASCII a..z or A..Z
			// 26..35 map to ASCII 0..9
			return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
		}

		/**
		 * Bias adaptation function as per section 3.4 of RFC 3492.
		 * http://tools.ietf.org/html/rfc3492#section-3.4
		 * @private
		 */
		function adapt(delta, numPoints, firstTime) {
			var k = 0;
			delta = firstTime ? floor(delta / damp) : delta >> 1;
			delta += floor(delta / numPoints);
			for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
				delta = floor(delta / baseMinusTMin);
			}
			return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
		}

		/**
		 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
		 * symbols.
		 * @memberOf punycode
		 * @param {String} input The Punycode string of ASCII-only symbols.
		 * @returns {String} The resulting string of Unicode symbols.
		 */
		function decode(input) {
			// Don't use UCS-2
			var output = [],
			    inputLength = input.length,
			    out,
			    i = 0,
			    n = initialN,
			    bias = initialBias,
			    basic,
			    j,
			    index,
			    oldi,
			    w,
			    k,
			    digit,
			    t,
			    /** Cached calculation results */
			    baseMinusT;

			// Handle the basic code points: let `basic` be the number of input code
			// points before the last delimiter, or `0` if there is none, then copy
			// the first basic code points to the output.

			basic = input.lastIndexOf(delimiter);
			if (basic < 0) {
				basic = 0;
			}

			for (j = 0; j < basic; ++j) {
				// if it's not a basic code point
				if (input.charCodeAt(j) >= 0x80) {
					error('not-basic');
				}
				output.push(input.charCodeAt(j));
			}

			// Main decoding loop: start just after the last delimiter if any basic code
			// points were copied; start at the beginning otherwise.

			for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

				// `index` is the index of the next character to be consumed.
				// Decode a generalized variable-length integer into `delta`,
				// which gets added to `i`. The overflow checking is easier
				// if we increase `i` as we go, then subtract off its starting
				// value at the end to obtain `delta`.
				for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

					if (index >= inputLength) {
						error('invalid-input');
					}

					digit = basicToDigit(input.charCodeAt(index++));

					if (digit >= base || digit > floor((maxInt - i) / w)) {
						error('overflow');
					}

					i += digit * w;
					t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

					if (digit < t) {
						break;
					}

					baseMinusT = base - t;
					if (w > floor(maxInt / baseMinusT)) {
						error('overflow');
					}

					w *= baseMinusT;

				}

				out = output.length + 1;
				bias = adapt(i - oldi, out, oldi == 0);

				// `i` was supposed to wrap around from `out` to `0`,
				// incrementing `n` each time, so we'll fix that now:
				if (floor(i / out) > maxInt - n) {
					error('overflow');
				}

				n += floor(i / out);
				i %= out;

				// Insert `n` at position `i` of the output
				output.splice(i++, 0, n);

			}

			return ucs2encode(output);
		}

		/**
		 * Converts a string of Unicode symbols (e.g. a domain name label) to a
		 * Punycode string of ASCII-only symbols.
		 * @memberOf punycode
		 * @param {String} input The string of Unicode symbols.
		 * @returns {String} The resulting Punycode string of ASCII-only symbols.
		 */
		function encode(input) {
			var n,
			    delta,
			    handledCPCount,
			    basicLength,
			    bias,
			    j,
			    m,
			    q,
			    k,
			    t,
			    currentValue,
			    output = [],
			    /** `inputLength` will hold the number of code points in `input`. */
			    inputLength,
			    /** Cached calculation results */
			    handledCPCountPlusOne,
			    baseMinusT,
			    qMinusT;

			// Convert the input in UCS-2 to Unicode
			input = ucs2decode(input);

			// Cache the length
			inputLength = input.length;

			// Initialize the state
			n = initialN;
			delta = 0;
			bias = initialBias;

			// Handle the basic code points
			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue < 0x80) {
					output.push(stringFromCharCode(currentValue));
				}
			}

			handledCPCount = basicLength = output.length;

			// `handledCPCount` is the number of code points that have been handled;
			// `basicLength` is the number of basic code points.

			// Finish the basic string - if it is not empty - with a delimiter
			if (basicLength) {
				output.push(delimiter);
			}

			// Main encoding loop:
			while (handledCPCount < inputLength) {

				// All non-basic code points < n have been handled already. Find the next
				// larger one:
				for (m = maxInt, j = 0; j < inputLength; ++j) {
					currentValue = input[j];
					if (currentValue >= n && currentValue < m) {
						m = currentValue;
					}
				}

				// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
				// but guard against overflow
				handledCPCountPlusOne = handledCPCount + 1;
				if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
					error('overflow');
				}

				delta += (m - n) * handledCPCountPlusOne;
				n = m;

				for (j = 0; j < inputLength; ++j) {
					currentValue = input[j];

					if (currentValue < n && ++delta > maxInt) {
						error('overflow');
					}

					if (currentValue == n) {
						// Represent delta as a generalized variable-length integer
						for (q = delta, k = base; /* no condition */; k += base) {
							t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
							if (q < t) {
								break;
							}
							qMinusT = q - t;
							baseMinusT = base - t;
							output.push(
								stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
							);
							q = floor(qMinusT / baseMinusT);
						}

						output.push(stringFromCharCode(digitToBasic(q, 0)));
						bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
						delta = 0;
						++handledCPCount;
					}
				}

				++delta;
				++n;

			}
			return output.join('');
		}

		/**
		 * Converts a Punycode string representing a domain name or an email address
		 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
		 * it doesn't matter if you call it on a string that has already been
		 * converted to Unicode.
		 * @memberOf punycode
		 * @param {String} input The Punycoded domain name or email address to
		 * convert to Unicode.
		 * @returns {String} The Unicode representation of the given Punycode
		 * string.
		 */
		function toUnicode(input) {
			return mapDomain(input, function(string) {
				return regexPunycode.test(string)
					? decode(string.slice(4).toLowerCase())
					: string;
			});
		}

		/**
		 * Converts a Unicode string representing a domain name or an email address to
		 * Punycode. Only the non-ASCII parts of the domain name will be converted,
		 * i.e. it doesn't matter if you call it with a domain that's already in
		 * ASCII.
		 * @memberOf punycode
		 * @param {String} input The domain name or email address to convert, as a
		 * Unicode string.
		 * @returns {String} The Punycode representation of the given domain name or
		 * email address.
		 */
		function toASCII(input) {
			return mapDomain(input, function(string) {
				return regexNonASCII.test(string)
					? 'xn--' + encode(string)
					: string;
			});
		}

		/*--------------------------------------------------------------------------*/

		/** Define the public API */
		punycode = {
			/**
			 * A string representing the current Punycode.js version number.
			 * @memberOf punycode
			 * @type String
			 */
			'version': '1.3.2',
			/**
			 * An object of methods to convert from JavaScript's internal character
			 * representation (UCS-2) to Unicode code points, and back.
			 * @see <https://mathiasbynens.be/notes/javascript-encoding>
			 * @memberOf punycode
			 * @type Object
			 */
			'ucs2': {
				'decode': ucs2decode,
				'encode': ucs2encode
			},
			'decode': decode,
			'encode': encode,
			'toASCII': toASCII,
			'toUnicode': toUnicode
		};

		/** Expose `punycode` */
		// Some AMD build optimizers, like r.js, check for specific condition patterns
		// like the following:
		if (
			true
		) {
			!(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
				return punycode;
			}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		} else if (freeExports && freeModule) {
			if (module.exports == freeExports) { // in Node.js or RingoJS v0.8.0+
				freeModule.exports = punycode;
			} else { // in Narwhal or RingoJS v0.7.0-
				for (key in punycode) {
					punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
				}
			}
		} else { // in Rhino or a web browser
			root.punycode = punycode;
		}

	}(this));

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(85)(module), (function() { return this; }())))

/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	exports.decode = exports.parse = __webpack_require__(120);
	exports.encode = exports.stringify = __webpack_require__(121);


/***/ },
/* 120 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	// If obj.hasOwnProperty has been overridden, then calling
	// obj.hasOwnProperty(prop) will break.
	// See: https://github.com/joyent/node/issues/1707
	function hasOwnProperty(obj, prop) {
	  return Object.prototype.hasOwnProperty.call(obj, prop);
	}

	module.exports = function(qs, sep, eq, options) {
	  sep = sep || '&';
	  eq = eq || '=';
	  var obj = {};

	  if (typeof qs !== 'string' || qs.length === 0) {
	    return obj;
	  }

	  var regexp = /\+/g;
	  qs = qs.split(sep);

	  var maxKeys = 1000;
	  if (options && typeof options.maxKeys === 'number') {
	    maxKeys = options.maxKeys;
	  }

	  var len = qs.length;
	  // maxKeys <= 0 means that we should not limit keys count
	  if (maxKeys > 0 && len > maxKeys) {
	    len = maxKeys;
	  }

	  for (var i = 0; i < len; ++i) {
	    var x = qs[i].replace(regexp, '%20'),
	        idx = x.indexOf(eq),
	        kstr, vstr, k, v;

	    if (idx >= 0) {
	      kstr = x.substr(0, idx);
	      vstr = x.substr(idx + 1);
	    } else {
	      kstr = x;
	      vstr = '';
	    }

	    k = decodeURIComponent(kstr);
	    v = decodeURIComponent(vstr);

	    if (!hasOwnProperty(obj, k)) {
	      obj[k] = v;
	    } else if (Array.isArray(obj[k])) {
	      obj[k].push(v);
	    } else {
	      obj[k] = [obj[k], v];
	    }
	  }

	  return obj;
	};


/***/ },
/* 121 */
/***/ function(module, exports) {

	// Copyright Joyent, Inc. and other Node contributors.
	//
	// Permission is hereby granted, free of charge, to any person obtaining a
	// copy of this software and associated documentation files (the
	// "Software"), to deal in the Software without restriction, including
	// without limitation the rights to use, copy, modify, merge, publish,
	// distribute, sublicense, and/or sell copies of the Software, and to permit
	// persons to whom the Software is furnished to do so, subject to the
	// following conditions:
	//
	// The above copyright notice and this permission notice shall be included
	// in all copies or substantial portions of the Software.
	//
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
	// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
	// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
	// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
	// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
	// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
	// USE OR OTHER DEALINGS IN THE SOFTWARE.

	'use strict';

	var stringifyPrimitive = function(v) {
	  switch (typeof v) {
	    case 'string':
	      return v;

	    case 'boolean':
	      return v ? 'true' : 'false';

	    case 'number':
	      return isFinite(v) ? v : '';

	    default:
	      return '';
	  }
	};

	module.exports = function(obj, sep, eq, name) {
	  sep = sep || '&';
	  eq = eq || '=';
	  if (obj === null) {
	    obj = undefined;
	  }

	  if (typeof obj === 'object') {
	    return Object.keys(obj).map(function(k) {
	      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
	      if (Array.isArray(obj[k])) {
	        return obj[k].map(function(v) {
	          return ks + encodeURIComponent(stringifyPrimitive(v));
	        }).join(sep);
	      } else {
	        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
	      }
	    }).join(sep);

	  }

	  if (!name) return '';
	  return encodeURIComponent(stringifyPrimitive(name)) + eq +
	         encodeURIComponent(stringifyPrimitive(obj));
	};


/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var uuid = __webpack_require__(12);
	var Promise = __webpack_require__(2);
	var WebSocket = (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') ?
	    window.WebSocket :
	    __webpack_require__(37);

	var util = __webpack_require__(13);
	var Connection = __webpack_require__(105);

	/**
	 * A websocket connection.
	 * @param {WebSocketTransport} transport
	 * @param {string | number | null} url  The url of the agent. The url must match
	 *                                      the url of the WebSocket server.
	 *                                      If url is null, a UUID id is generated as url.
	 * @param {function} receive
	 * @constructor
	 */
	function WebSocketConnection(transport, url, receive) {
	  this.transport = transport;
	  this.url = url ? util.normalizeURL(url) : uuid();
	  this.receive = receive;

	  this.sockets = {};
	  this.closed = false;
	  this.reconnectTimers = {};

	  // ready state
	  this.ready = Promise.resolve(this);
	}

	/**
	 * Send a message to an agent.
	 * @param {string} to   The WebSocket url of the receiver
	 * @param {*} message
	 * @return {Promise} Returns a promise which resolves when the message is sent,
	 *                   and rejects when sending the message failed
	 */
	WebSocketConnection.prototype.send = function (to, message) {
	  //console.log('send', this.url, to, message); // TODO: cleanup

	  // deliver locally when possible
	  if (this.transport.localShortcut) {
	    var agent = this.transport.agents[to];
	    if (agent) {
	      try {
	        agent.receive(this.url, message);
	        return Promise.resolve();
	      }
	      catch (err) {
	        return Promise.reject(err);
	      }
	    }
	  }

	  // get or create a connection
	  var conn = this.sockets[to];
	  if (conn) {
	    try {
	      if (conn.readyState == conn.CONNECTING) {
	        // the connection is still opening
	        return new Promise(function (resolve, reject) {
	          //console.log(conn.onopen)//, conn.onopen.callback)
	          conn.onopen.callbacks.push(function () {
	            conn.send(JSON.stringify(message));
	            resolve();
	          })
	        });
	      }
	      else if (conn.readyState == conn.OPEN) {
	        conn.send(JSON.stringify(message));
	        return Promise.resolve();
	      }
	      else {
	        // remove the connection
	        conn = null;
	      }
	    }
	    catch (err) {
	      return Promise.reject(err);
	    }
	  }

	  if (!conn) {
	    // try to open a connection
	    var me = this;
	    return new Promise(function (resolve, reject) {
	      me._connect(to, function (conn) {
	        conn.send(JSON.stringify(message));
	        resolve();
	      }, function (err) {
	        reject(new Error('Failed to connect to agent "' + to + '"'));
	      });
	    })
	  }
	};

	/**
	 * Open a websocket connection to an other agent. No messages are sent.
	 * @param {string} to  Url of the remote agent.
	 * @returns {Promise.<WebSocketConnection, Error>}
	 *              Returns a promise which resolves when the connection is
	 *              established and rejects in case of an error.
	 */
	WebSocketConnection.prototype.connect = function (to) {
	  var me = this;
	  return new Promise(function (resolve, reject) {
	    me._connect(to, function () {
	      resolve(me);
	    }, reject);
	  });
	};

	/**
	 * Open a websocket connection
	 * @param {String} to   Url of the remote agent
	 * @param {function} [callback]
	 * @param {function} [errback]
	 * @param {boolean} [doReconnect=false]
	 * @returns {WebSocket}
	 * @private
	 */
	WebSocketConnection.prototype._connect = function (to, callback, errback, doReconnect) {
	  var me = this;
	  var conn = new WebSocket(to + '?id=' + this.url);

	  // register the new socket
	  me.sockets[to] = conn;

	  conn.onopen = function () {
	    // Change doReconnect to true as soon as we have had an open connection
	    doReconnect = true;

	    conn.onopen.callbacks.forEach(function (cb) {
	      cb(conn);
	    });
	    conn.onopen.callbacks = [];
	  };
	  conn.onopen.callbacks = callback ? [callback] : [];

	  conn.onmessage = function (event) {
	    me.receive(to, JSON.parse(event.data));
	  };

	  conn.onclose = function () {
	    delete me.sockets[to];
	    if (doReconnect) {
	      me._reconnect(to);
	    }
	  };

	  conn.onerror = function (err) {
	    delete me.sockets[to];
	    if (errback) {
	      errback(err);
	    }
	  };

	  return conn;
	};

	/**
	 * Auto reconnect a broken connection
	 * @param {String} to   Url of the remote agent
	 * @private
	 */
	WebSocketConnection.prototype._reconnect = function (to) {
	  var me = this;
	  var doReconnect = true;
	  if (me.closed == false && me.reconnectTimers[to] == null) {
	    me.reconnectTimers[to] = setTimeout(function () {
	      delete me.reconnectTimers[to];
	      me._connect(to, null, null, doReconnect);
	    }, me.transport.reconnectDelay);
	  }
	};

	/**
	 * Register a websocket connection
	 * @param {String} from       Url of the remote agent
	 * @param {WebSocket} conn    WebSocket connection
	 * @returns {WebSocket}       Returns the websocket itself
	 * @private
	 */
	WebSocketConnection.prototype._onConnection = function (from, conn) {
	  var me = this;

	  conn.onmessage = function (event) {
	    me.receive(from, JSON.parse(event.data));
	  };

	  conn.onclose = function () {
	    // remove this connection from the sockets list
	    delete me.sockets[from];
	  };

	  conn.onerror = function (err) {
	    // TODO: what to do with errors?
	    delete me.sockets[from];
	  };

	  if (this.sockets[from]) {
	    // there is already a connection open with remote agent
	    // TODO: what to do with overwriting existing sockets?
	    this.sockets[from].close();
	  }

	  // register new connection
	  this.sockets[from] = conn;

	  return conn;
	};

	/**
	 * Get a list with all open sockets
	 * @return {String[]} Returns all open sockets
	 */
	WebSocketConnection.prototype.list = function () {
	  return Object.keys(this.sockets);
	};

	/**
	 * Close the connection. All open sockets will be closed and the agent will
	 * be unregistered from the WebSocketTransport.
	 */
	WebSocketConnection.prototype.close = function () {
	  this.closed = true;

	  // close all connections
	  for (var id in this.sockets) {
	    if (this.sockets.hasOwnProperty(id)) {
	      this.sockets[id].close();
	    }
	  }
	  this.sockets = {};

	  delete this.transport.agents[this.url];
	};

	module.exports = WebSocketConnection;


/***/ }
/******/ ])
});
;