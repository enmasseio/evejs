'use strict';

var hypertimer = require('hypertimer');
var TransportManager = require('./TransportManager');

function ServiceManager(config) {
  this.transports = new TransportManager();

  this.timer = hypertimer();

  this.init(config);
}

/**
 * Initialize the service manager with services loaded from a configuration
 * object. All current services are unloaded and removed.
 * @param {Object} config
 */
ServiceManager.prototype.init = function (config) {
  this.transports.clear();

  if (config) {
    if (config.transports) {
      this.transports.load(config.transports);
    }
    if (config.timer) {
      this.timer.config(config.timer);
    }
  }
};

/**
 * Clear all configured services
 */
ServiceManager.prototype.clear = function () {
  this.transports.clear();
};

module.exports = ServiceManager;
