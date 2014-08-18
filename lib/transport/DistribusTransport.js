var Promise = require('promise');
var distribus = require('distribus');
var Transport = require('./Transport');

/**
 * Use distribus as transport
 * @param {Object} config         Can contain an optional parameter `host`,
 *                                a distribus Host. If `host` is not provided,
 *                                a new local distribus Host is created.
 * @constructor
 */
function DistribusTransport(config) {
  this.host = config && config.host || new distribus.Host();

  /**
   * Send a message to an agent
   * @param {String} from    Id of sender
   * @param {String} to      Id of addressed agent
   * @param {String} message
   */
  this.send = this.host._send; // TODO: change this to this.host.send after next release of distribus
}

DistribusTransport.prototype = new Transport();

DistribusTransport.prototype.type = 'distribus';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive                      Invoked as receive(from, message)
 * @return {Promise.<DistribusTransport, Error>} Returns a promise which resolves when
 *                                                connected.
 */
DistribusTransport.prototype.connect = function(id, receive) {
  // create an agent
  var agent = this.host.create(id);

  // register a listener
  agent.on('message', receive);

  return Promise.resolve(this);
};

/**
 * Disconnect an agent by its id
 * @param {String} id
 */
DistribusTransport.prototype.disconnect = function(id) {
  this.host.remove(id);
};

module.exports = DistribusTransport;
