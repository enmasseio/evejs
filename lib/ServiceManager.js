'use strict';

var TransportManager = require('./TransportManager');

function ServiceManager(config) {
  this.transports = new TransportManager();

  this.load(config);
}

/**
 * Clear all configured services and load new services from provided configuration
 * @param {Object} config
 */
ServiceManager.prototype.init = function (config) {
  this.clear();
  this.load(config);
};

/**
 * Load services from a configuration object
 * @param {Object} config
 */
ServiceManager.prototype.load = function (config) {
  if (config && config.transports) {
    this.transports.load(config.transports);
  }
};

/**
 * Clear all configured services from the ServiceManager
 */
ServiceManager.prototype.clear = function () {
  this.transports.clear();
};

module.exports = ServiceManager;
