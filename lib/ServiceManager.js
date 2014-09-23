'use strict';

var seed = require('seed-random');
var hypertimer = require('hypertimer');
var TransportManager = require('./TransportManager');

// map with known configuration properties
var KNOWN_PROPERTIES = {
  transports: true,
  timer: true,
  random: true
};

function ServiceManager(config) {
  this.transports = new TransportManager();

  this.timer = hypertimer();

  this.random = Math.random;

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

    if (config.random) {
      if (config.random.deterministic) {
        var key = config.random.seed || 'random seed';
        this.random = seed(key, config.random);
      }
      else {
        this.random = Math.random;
      }
    }

    for (var prop in config) {
      if (config.hasOwnProperty(prop) && !KNOWN_PROPERTIES[prop]) {
        // TODO: should log this warning via a configured logger
        console.log('WARNING: Unknown configuration option "' + prop + '"')
      }
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
