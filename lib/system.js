// load a default ServiceManager with a LocalTransport
var ServiceManager = require('./ServiceManager');
var LocalTransport = require('./transport/LocalTransport');

var system = new ServiceManager();
system.transports.add(new LocalTransport());

module.exports = system;
