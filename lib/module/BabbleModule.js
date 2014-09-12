'use strict';

var babble = require('babble');

/**
 * Create a Babble module for an agent.
 * The agents _receive function is wrapped into a new handler.
 * Creates a Babble instance with function `ask`, `tell`, `listen`, `listenOnce`
 * @param {Agent} agent
 * @param {Object} [options]   Optional parameters. Not applicable for BabbleModule
 * @constructor
 */
function BabbleModule(agent, options) {
  var receiveOriginal = agent._receive;

  // create a new babbler
  var babbler = babble.babbler(agent.id);
  this.babbler = babbler;

  // attach receive function to the agent
  this._receive = function (from, message) {
    babbler._receive(message);
    // TODO: only propagate to receiveOriginal if the message is not handled by the babbler
    return receiveOriginal.call(agent, from, message);
  };
}

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
