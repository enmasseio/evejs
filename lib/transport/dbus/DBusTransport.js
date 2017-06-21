'use strict';

var Transport = require('./../Transport');
var DBusConnection = require('./DBusConnection');

/**
 * Use DBus as transport
 * @param {Object} config         Config can contain the following properties
 * @constructor
 */
function DBusTransport(config) {
  this.config = config;
}

DBusTransport.prototype = new Transport();
DBusTransport.prototype.type = 'dbus';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive  Invoked as receive(from, message)
 * @return {DBusConnection} Returns a connection
 */
DBusTransport.prototype.connect = function (id, receive) {
  return new DBusConnection(this, id, receive)
};

/**
 * Close the transport.
 */
DBusTransport.prototype.close = function () {
};

module.exports = DBusTransport;
