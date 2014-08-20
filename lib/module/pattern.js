/**
 * Add support for pattern listening to an object. The object will be extended
 * with functions `listen` and `unlisten`.
 * @param {Object} object
 * @param {Object} [options]   Optional parameters. Can contain properties:
 *                            - receive: string   The name of an alternative
 *                                                receive function available
 *                                                on the actor.
 *                            - stopPropagation: boolean
 *                                                When false (default), a message
 *                                                will be delivered at all
 *                                                matching pattern listeners.
 *                                                When true, a message will be
 *                                                be delivered at the first
 *                                                matching pattern listener only.
 * @return {Object} Returns the object itself
 */
function patternize(object, options) {
  var receiveName = options && options.receive || 'receive';
  var stopPropagation = options && options.stopPropagation || false;
  var receiveOriginal = object[receiveName] || null;
  var listeners = [];

  // validate object
  ['listen', 'unlisten'].forEach(function (prop) {
    if (object[prop] !== undefined) {
      throw new Error('Conflict: agent already has a property "' + prop + '"');
    }
  });

  /**
   * Receive a message.
   * All pattern listeners will be checked against their patterns, and if there
   * is a match, the pattern listeners callback function is invoked.
   * @param {string} from     Id of sender
   * @param {*} message       Received message, a JSON object (often a string)
   */
  object[receiveName] = function(from, message) {
    var response;
    var responses = [];
    for (var i = 0, ii = listeners.length; i < ii; i++) {
      var listener = listeners[i];
      var pattern = listener.pattern;
      var match = (pattern instanceof Function && pattern(message)) ||
          (pattern instanceof RegExp && pattern.test(message)) ||
          (pattern == message);

      if (match) {
        response = listener.callback.call(object, from, message);
        responses.push(response);
        if (stopPropagation) {
          return responses[0];
        }
      }
    }

    response = receiveOriginal.call(object, from, message);
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
  object.listen = function(pattern, callback) {
    listeners.push({
      pattern: pattern,
      callback: callback
    });
  };

  /**
   * Remove a pattern listener for incoming messages
   * @param {string | RegExp | Function} pattern    Message pattern
   * @param {Function} callback
   */
  object.unlisten = function(pattern, callback) {
    for (var i = 0, ii = listeners.length; i < ii; i++) {
      var listener = listeners[i];
      if (listener.pattern === pattern && listener.callback === callback) {
        listeners.splice(i, 1);
        break;
      }
    }
  };

  object.__pattern__ = {
    listeners: listeners,
    receiveName: receiveName,
    receiveOriginal: receiveOriginal
  };

  return object;
}

/**
 * Remove pattern listening features from the object
 * @param {Object} object
 * @returns {Object} Returns the object itself
 */
function unpatternize(object) {
  var __pattern__ = object.__pattern__;
  if (__pattern__) {
    delete object.__pattern__;
    delete object.listen;
    delete object.unlisten;
    delete object[__pattern__.receiveName];

    // restore any original receive method
    if (__pattern__.receiveOriginal) {
      object[__pattern__.receiveName] = __pattern__.receiveOriginal;
    }
  }

  return object;
}

exports.patternize = patternize;
exports.unpatternize = unpatternize;
