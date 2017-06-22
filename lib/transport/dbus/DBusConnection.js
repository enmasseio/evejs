'use strict';

var Promise = require('promise');
var Connection = require('../Connection');
var dbus = require("dbus-native");

/**
 * A connection. The connection is ready when the property .ready resolves.
 * @param {DBusTransport} transport
 * @param {string | number} id
 * @param {function} receive
 * @constructor
 */

var serviceName = "com.almende.eve";
const interfaceName = "com.almende.eve.agent";
const objectName = "/agent/";
const OutSessionBus = dbus.sessionBus();
const InSessionBus = dbus.sessionBus();

function DBusConnection(transport, id, receive) {
  this.id = id;
  if (transport.config && transport.config.url) {
    var parsed = this.fromUrl(transport.config.url);
    if (parsed.objectName) {
      this.objectName = parsed.objectName;
      this.serviceName = parsed.serviceName;
      this.url = "dbus:" + parsed.serviceName + parsed.objectName + id;
    }
  }
  if (!this.url || !this.url.startsWith("dbus:")) {
    this.url = "dbus:" + serviceName + objectName + id;
    this.objectName = objectName;
    this.serviceName = serviceName;
  }
  this.transport = transport;

  // ready state
  var me = this;

  this.ready = new Promise(function (resolve, reject) {
    InSessionBus.requestName(me.serviceName, 0x4, function (e, retCode) {

      // If there was an error, warn user and fail
      if (e) {
        console.log("ERROR: Could not request service name " + me.serviceName + ", the error was:", e);
      }

      // Return code 0x1 means we successfully had the name, 0x3 name existed, 0x4 we already had the name
      if (!(retCode === 1 || retCode === 3 || retCode === 4)) {
        /* Other return codes means various errors, check here
         (https://dbus.freedesktop.org/doc/api/html/group__DBusShared.html#ga37a9bc7c6eb11d212bf8d5e5ff3b50f9) for more
         information
         */
        console.log("ERROR: Failed to request service name " + me.serviceName + ". Check what return code " + retCode + " means.");
        reject();
        return;
      }

      var interface_desc = {
        name: interfaceName,
        methods: {
          "receive": ["ss", "", ["Message", "Sender"], []]
        }
      };
      var intf = {
        receive: function (msg, sender) {
          var message;
          try {
            message = JSON.parse(msg);
          } catch (err) {
            message = msg;
          }
          //TODO: setup full sender URL, check!
          receive(sender, message);
        }
      };

      InSessionBus.exportInterface(intf, me.objectName + id, interface_desc);
      resolve();
    });
  });
}


DBusConnection.prototype.fromUrl = function (url) {
  if (url.startsWith("dbus:")) {
    var sn = url.substring(url.indexOf(":") + 1, url.indexOf("/"));
    var on = url.substring(url.indexOf("/")).replace(":id", "");

    return {
      serviceName: sn,
      objectName: on
    }
  } else {
    return {
      serviceName: this.serviceName,
      objectName: this.objectName + url
    }
  }
}

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
DBusConnection.prototype.send = function (to, message) {
  var me = this;
  var parsed = me.fromUrl(to);
  if (!parsed.objectName) {
    return Promise.reject();
  }
  var peerName = parsed.objectName;
  var peerServiceName = parsed.serviceName;
  return new Promise(function (resolve, reject) {

    var service = OutSessionBus.getService(peerServiceName);
    service.getInterface(peerName, interfaceName, function (e, iface) {
      if (e) {
        console.log('Failed to request interface \'' + interfaceName + '\' at \'' + peerName + '\' : ' + e ? e : '(no error)')
        reject();
        return;
      }
      if (typeof message !== "string"){
        message = JSON.stringify(message);
      }
      iface.receive(message, me.url, function (e, res) {
        if (e) {
          console.log('Failed to call receive on agent ' + to + ': ' + e ? e : '(no error)')
          reject();
        } else {
          resolve();
        }
      });

    });

  });
};

/**
 * Close the connection
 */
DBusConnection.prototype.close = function () {

};

module.exports = DBusConnection;
