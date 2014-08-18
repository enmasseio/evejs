exports.Agent = require('./lib/Agent');

exports.ServiceManager = require('./lib/ServiceManager');
exports.TransportManager = require('./lib/TransportManager');

exports.transport = {
  Transport: require('./lib/transport/Transport'),
  LocalTransport: require('./lib/transport/LocalTransport'),
  PubNubTransport: require('./lib/transport/PubNubTransport'),
  AMQPTransport: require('./lib/transport/AMQPTransport'),
  DistribusTransport: require('./lib/transport/DistribusTransport')
};

// load a default ServiceManager with a LocalTransport
exports.defaultServiceManager = new exports.ServiceManager();
exports.defaultServiceManager.transports.add(new exports.transport.LocalTransport());
