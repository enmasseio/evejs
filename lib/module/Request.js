var uuid = require('node-uuid');
var Promise = require('promise');
var util = require('../util');

var TIMEOUT = 60000; // ms

/**
 * Create a Request module.
 * The module attaches a handler to the agents _receive function.
 *
 * @param {Agent} agent
 * @param {Object} [options]   Optional parameters. Can contain properties:
 *                            - extend: boolean   If true, the agent is extended
 *                                                with a functions `request`.
 *                                                If false (default), this function
 *                                                is available at the Request object
 *                                                itself.
 *                            - timeout: number   A timeout for responses in
 *                                                milliseconds. 60000 ms by
 *                                                default.
 */
function Request(agent, options) {
  var receiveName = options && options.receive || 'receive';
  var receiveOriginal = agent[receiveName] || null;
  var timeout = options && options.timeout || TIMEOUT;
  var queue = [];

  /**
   * Event handler, handles incoming messages
   * @param {String} from     Id of the sender
   * @param {*} message
   * @return {boolean} Returns true when a message is handled, else returns false
   */
  agent[receiveName] = function (from, message) {
    if (typeof message === 'object') {
      var envelope = message;

      // match the request from the id in the response
      var request = queue[envelope.id];
      if (request) {
        // remove the request from the queue
        clearTimeout(request.timeout);
        delete queue[envelope.id];

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
          var response = receiveOriginal.call(agent, from, message.message);
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
      if (receiveOriginal) {
        receiveOriginal.call(agent, from, message);
      }
    }
  };

  /**
   * Send a request
   * @param {string} to   Id of the recipient
   * @param {*} message
   * @returns {Promise.<*, Error>} Returns a promise resolving with the response message
   */
  this.request = function (to, message) {
    return new Promise(function (resolve, reject) {
      // put the data in an envelope with id
      var id = uuid.v1();
      var envelope = {
        type: 'request',
        id: id,
        message: message
      };

      // add the request to the list with requests in progress
      queue[id] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(function () {
          delete queue[id];
          reject(new Error('Timeout'));
        }, timeout)
      };

      agent.send(to, envelope);
    });
  };

  /**
   * Remove request features from the agent
   */
  this.destroy = function () {
    if (agent.receive === this.receive) {
      if (receiveOriginal) {
        agent[receiveName] = receiveOriginal;
      }
      else {
        delete agent[receiveName];
      }
    }
    if (agent.request === this.listen) delete agent.request;
  };

  if (options && options.extend) {
    // check for conflicts
    if (agent['request'] !== undefined) {
      throw new Error('Conflict: agent already has a property "request"');
    }

    // extend the agent with the functions provided by Request
    agent.request = this.request;
  }

}

module.exports = Request;
