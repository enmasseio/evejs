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
  this._receive = function (from, message, oobParams) {
    babbler._receive(message, oobParams);
    // TODO: only propagate to receiveOriginal if the message is not handled by the babbler
    return receiveOriginal.call(agent, from, message, oobParams);
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
