'use strict';

var ServiceManager = require('./ServiceManager');
var LocalTransport = require('./transport/local/LocalTransport');

// load the default ServiceManager, a singleton, initialized with a LocalTransport
var system = new ServiceManager();
system.transports.add(new LocalTransport());

module.exports = system;
