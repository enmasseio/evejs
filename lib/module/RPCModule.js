'use strict';

var uuid = require('node-uuid');
var Promise = require('promise');


/**
 *
 * @param {Agent} agent
 * @param {Object} availableFunctions
 * @constructor
 */
function RPCModule(agent, availableFunctions) {
  this.agent = agent;
  this.receiveOriginal = agent._receive;
  this.queue = {};
  this.promiseTimeout = 1000; // 1 second

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
  return new Promise(function (resolve, reject) {
    // prepare the envelope
    if (message         === undefined) {reject(new Error('Message is empty.'));}
    if (typeof message  !=  'object' ) {reject(new Error('message must be an object'));}
    if (message.jsonrpc === undefined) {message.jsonrpc = '2.0';}
    if (message.jsonrpc !== '2.0'    ) {message.jsonrpc = '2.0';}
    if (message.method  === undefined) {reject(new Error('method must be supplied'));}
    if (message.params  === undefined) {message.params = {};}

    // generate an envelope id
    message.id = uuid.v1();

    // add the request to the list with requests in progress
    this.queue[message.id] = {
      resolve: resolve,
      reject: reject,
      timeout: setTimeout(function () {
        delete this.queue[message.id];
        reject(new Error('Timeout'));
      }.bind(this), this.promiseTimeout)
    };

    this.agent.send(to, message);
  }.bind(this));
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
  var returnMessage = {jsonrpc:'2.0', id:message.id, result: null, error:null};

  // check if this is a request
  if (message.method !== undefined) {
    // check is method is available for this agent
    var method = this.availableFunctions[message.method];
    if (method !== undefined) {
      returnMessage.result = method.call(this.agent, message.params, from);
    }
    else {
      var error = new Error('Cannot find function', message,method);
      returnMessage.error = error.message || error.toString();
    }
    this.agent.send(from,returnMessage);
  }
  // check if this is a reponse
  else if (message.result !== undefined) {
    var request = this.queue[message.id];
    if (request !== undefined) {
      // if an error is defined, reject promise
      if (message.error !== null) {
        request.reject(new Error(message.error));
      }
      else {
        request.resolve(message.result);
      }
    }
  }
  else {
    // send error back to sender.
    var error = new Error('No method or result defined. Message:', JSON.stringify(message));
    returnMessage.error = error.message || error.toString();
    this.agent.send(from,returnMessage);
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