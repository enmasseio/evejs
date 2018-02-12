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
PatternModule.prototype.receive = function(from, message, oobParams) {
  var response;
  var responses = [];
  for (var i = 0, ii = this.listeners.length; i < ii; i++) {
    var listener = this.listeners[i];
    var pattern = listener.pattern;
    var match = (pattern instanceof Function && pattern(message)) ||
        (pattern instanceof RegExp && pattern.test(message)) ||
        (pattern == message);

    if (match) {
      response = listener.callback.call(this.agent, from, message, oobParams);
      responses.push(response);
      if (this.stopPropagation) {
        return responses[0];
      }
    }
  }

  response = this.receiveOriginal.call(this.agent, from, message, oobParams);
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
