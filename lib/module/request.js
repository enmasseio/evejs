var uuid = require('node-uuid');
var Promise = require('promise');
var util = require('../util');

var TIMEOUT = 60000; // ms

/**
 * Add support for request/response pattern.
 *
 * @param {{send: function, receive: function}} object
 * @param {{receive: string, timeout: number}} options  TODO: describe options
 * @return {Object} Returns the requestified object itself
 */
function requestify(object, options) {
  var receiveName = options && options.receive || 'receive';
  var receiveOriginal = object[receiveName] || null;
  var timeout = options && options.timeout || TIMEOUT;
  var queue = [];

  var __request__ = {
    queue: queue,
    receiveName: receiveName,
    receiveOriginal: receiveOriginal
  };

  // validate object
  if (object['request'] !== undefined) {
    throw new Error('Conflict: agent already has a property "request"');
  }
  /**
   * Event handler, handles incoming messages
   * @param {String} from     Id of the sender
   * @param {*} message
   * @return {boolean} Returns true when a message is handled, else returns false
   */
  object[receiveName] = function (from, message) {
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
          request.reject(envelope.error);
        }
        else {
          request.resolve(envelope.message);
        }
        return true;
      }
      else if (message.type == 'request') {
        var response = receiveOriginal.call(object, from, message.message);
        if (util.isPromise(response)) {
          // wait until the promise resolves
          response
              .catch(function (err) {
                return err.toString();
              })
              .then(function (reply) {
                object.send(from, {
                  type: 'request',
                  id: message.id,
                  message: reply
                });
              });
        }
        else {
          // immediately send a reply
          object.send(from, {
            type: 'request',
            id: message.id,
            message: response
          });
        }
      }
    }
    else {
      if (receiveOriginal) {
        receiveOriginal.call(object, from, message);
      }
    }
  };

  /**
   * Send a request
   * @param {string} to   Id of the recipient
   * @param {*} message
   * @returns {Promise.<*, Error>} Returns a promise resolving with the response message
   */
  object.request = function (to, message) {
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

      object.send(to, envelope);
    });
  };

  object.__request__ = __request__;

  return object;
}

/**
 * Remove pattern listening features from the object
 * @param {Object} object
 * @returns {Object} Returns the object itself
 */
function unrequestify(object) {
  var __request__ = object.__request__;
  if (__request__) {
    delete object.__request__;
    delete object.request;
    delete object[__request__.receiveName];

    // restore any original receive method
    if (__request__.receiveOriginal) {
      object[__request__.receiveName] = __request__.receiveOriginal;
    }
  }

  return object;
}

exports.requestify = requestify;
exports.unrequestify = unrequestify;
