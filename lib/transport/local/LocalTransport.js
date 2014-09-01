var Transport = require('./../Transport');
var LocalConnection = require('./LocalConnection');

/**
 * Create a local transport.
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 * @constructor
 */
function LocalTransport(config) {
  this.id = config && config.id || null;
  this['default'] = config && config['default'] || false;
  this.agents = {};
}

LocalTransport.prototype = new Transport();

LocalTransport.prototype.type = 'local';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive                  Invoked as receive(from, message)
 * @return {LocalConnection} Returns a promise which resolves when
 *                                                connected.
 */
LocalTransport.prototype.connect = function(id, receive) {
  return new LocalConnection(this, id, receive);
};

module.exports = LocalTransport;
