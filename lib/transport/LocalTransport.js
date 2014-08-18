var Promise = require('promise');
var Transport = require('./Transport');

/**
 * Create a local transport.
 * @constructor
 */
function LocalTransport() {
  this.agents = {};
}

LocalTransport.prototype = new Transport();

LocalTransport.prototype.type = 'local';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive                  Invoked as receive(from, message)
 * @return {Promise.<LocalTransport, Error>} Returns a promise which resolves when
 *                                                connected.
 */
LocalTransport.prototype.connect = function(id, receive) {
  if (id in this.agents) {
    throw new Error('Agent with id ' + id + ' already exists');
  }

  this.agents[id] = receive;

  return Promise.resolve(this);
};

/**
 * Disconnect an agent by its id
 * @param {String} id
 */
LocalTransport.prototype.disconnect = function(id) {
  delete this.agents[id];
};

/**
 * Send a message to an agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed agent
 * @param {String} message
 */
LocalTransport.prototype.send = function(from, to, message) {
  var callback = this.agents[to];
  if (!callback) {
    throw new Error('Agent with id ' + to + ' not found');
  }

  // invoke as callback(from, message)
  callback.apply(callback, [from].concat(Array.prototype.slice.call(arguments, 2)));
};

module.exports = LocalTransport;
