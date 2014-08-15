var TransportManager = require('./TransportManager');

function ServiceManager(config) {
  this.transports = new TransportManager(config && config.transports);
}

module.exports = ServiceManager;
