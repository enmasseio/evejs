exports.Agent = require('./lib/Agent');
exports.LocalAgent = require('./lib/LocalAgent');

exports.ServiceManager = require('./lib/ServiceManager');
exports.TransportManager = require('./lib/TransportManager');

exports.module = {
  Pattern: require('./lib/module/Pattern'),
  Request: require('./lib/module/Request')
};

exports.transport = {
  Transport: require('./lib/transport/Transport'),
  LocalTransport: require('./lib/transport/LocalTransport'),
  PubNubTransport: require('./lib/transport/PubNubTransport'),
  AMQPTransport: require('./lib/transport/AMQPTransport'),
  DistribusTransport: require('./lib/transport/DistribusTransport')
};

exports.system = require('./lib/system');
