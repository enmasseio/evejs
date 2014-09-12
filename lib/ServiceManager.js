'use strict';

var TransportManager = require('./TransportManager');

function ServiceManager(config) {
  this.transports = new TransportManager();

  this.init(config);
}

/**
 * Initialize the service manager with services loaded from a configuration
 * object. All current services are unloaded and removed.
 * @param {Object} config
 */
ServiceManager.prototype.init = function (config) {
  this.transports.clear();

  if (config && config.transports) {
    this.transports.load(config.transports);
  }
};

/**
 * Clear all configured services
 */
ServiceManager.prototype.clear = function () {
  this.transports.clear();
};

module.exports = ServiceManager;
