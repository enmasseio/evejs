'use strict';

var uuid = require('uuid-v4');
var Promise = require('promise');
var util = require('../util');

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
