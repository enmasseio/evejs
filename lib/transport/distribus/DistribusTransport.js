var distribus = require('distribus');
var Transport = require('./../Transport');
var DistribusConnection = require('./DistribusConnection');

/**
 * Use distribus as transport
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 *                                - `host: distribus.Host`. Optional
 *                                If `host` is not provided,
 *                                a new local distribus Host is created.
 * @constructor
 */
function DistribusTransport(config) {
  this.id = config && config.id || null;
  this['default'] = config && config['default'] || false;
  this.host = config && config.host || new distribus.Host(config);

  this.networkId = this.host.networkId; // FIXME: networkId can change when host connects to another host.
}

DistribusTransport.prototype = new Transport();

DistribusTransport.prototype.type = 'distribus';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive     Invoked as receive(from, message)
 * @return {DistribusConnection} Returns a connection.
 */
DistribusTransport.prototype.connect = function(id, receive) {
  return new DistribusConnection(this, id, receive);
};

module.exports = DistribusTransport;
