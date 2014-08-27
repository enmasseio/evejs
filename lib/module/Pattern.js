/**
 * Create a pattern listener onto an Agent.
 * A new handler is added to the agents receiver function.
 * Creates a Pattern instance with functions `listen` and `unlisten`.
 * @param {Agent} agent
 * @param {Object} [options]   Optional parameters. Can contain properties:
 *                            - extend: boolean   If true, the agent is extended
 *                                                with the functions `listen`
 *                                                and `unlisten`. If false
 *                                                (default), these functions
 *                                                are just available at the
 *                                                Pattern itself.
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
 */
function Pattern(agent, options) {
  var receiveName = options && options.receive || 'receive';
  var stopPropagation = options && options.stopPropagation || false;
  var receiveOriginal = agent[receiveName] || null;
  var listeners = [];

  /**
   * Receive a message.
   * All pattern listeners will be checked against their patterns, and if there
   * is a match, the pattern listeners callback function is invoked.
   * @param {string} from     Id of sender
   * @param {*} message       Received message, a JSON object (often a string)
   */
  this.receive = agent[receiveName] = function(from, message) {
    var response;
    var responses = [];
    for (var i = 0, ii = listeners.length; i < ii; i++) {
      var listener = listeners[i];
      var pattern = listener.pattern;
      var match = (pattern instanceof Function && pattern(message)) ||
          (pattern instanceof RegExp && pattern.test(message)) ||
          (pattern == message);

      if (match) {
        response = listener.callback.call(agent, from, message);
        responses.push(response);
        if (stopPropagation) {
          return responses[0];
        }
      }
    }

    response = receiveOriginal.call(agent, from, message);
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
  this.listen = function(pattern, callback) {
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
  this.unlisten = function(pattern, callback) {
    for (var i = 0, ii = listeners.length; i < ii; i++) {
      var listener = listeners[i];
      if (listener.pattern === pattern && listener.callback === callback) {
        listeners.splice(i, 1);
        break;
      }
    }
  };

  /**
   * Remove pattern listening features from the agent
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
    if (agent.listen === this.listen) delete agent.listen;
    if (agent.unlisten === this.listen) delete agent.unlisten;
  };

  if (options && options.extend) {
    // check for conflicts
    ['listen', 'unlisten'].forEach(function (prop) {
      if (agent[prop] !== undefined) {
        throw new Error('Conflict: agent already has a property "' + prop + '"');
      }
    });

    // extend the agent with the functions provided by Pattern
    agent.listen = this.listen;
    agent.unlisten = this.unlisten;
  }
}

module.exports = Pattern;
