exports.Agent = require('./lib/Agent');

exports.ServiceManager = require('./lib/ServiceManager');

exports.transport = {
  Transport: require('./lib/transport/Transport'),
  LocalTransport: require('./lib/transport/LocalTransport'),
  PubNubTransport: require('./lib/transport/PubNubTransport'),
  AMQPTransport: require('./lib/transport/AMQPTransport'),
  DistribusTransport: require('./lib/transport/DistribusTransport')
};
