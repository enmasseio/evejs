exports.Agent = require('./lib/Agent');

exports.ServiceManager = require('./lib/ServiceManager');
exports.TransportManager = require('./lib/TransportManager');

exports.hypertimer = require('hypertimer');

exports.module = {
  BabbleModule: require('./lib/module/BabbleModule'),
  PatternModule: require('./lib/module/PatternModule'),
  RequestModule: require('./lib/module/RequestModule'),
  RPCModule: require('./lib/module/RPCModule')
};

exports.transport = {
  Transport:          require('./lib/transport/Transport'),

  AMQPTransport:      require('./lib/transport/amqp/AMQPTransport'),
  DistribusTransport: require('./lib/transport/distribus/DistribusTransport'),
  HTTPTransport:      require('./lib/transport/http/HTTPTransport'),
  LocalTransport:     require('./lib/transport/local/LocalTransport'),
  PubNubTransport:    require('./lib/transport/pubnub/PubNubTransport'),
  WebSocketTransport: require('./lib/transport/websocket/WebSocketTransport'),

  connection: {
    Connection:          require('./lib/transport/Connection'),

    AMQPConnection:      require('./lib/transport/amqp/AMQPConnection'),
    DistribusConnection: require('./lib/transport/distribus/DistribusConnection'),
    HTTPConnection:      require('./lib/transport/http/HTTPConnection'),
    LocalConnection:     require('./lib/transport/local/LocalConnection'),
    PubNubConnection:    require('./lib/transport/pubnub/PubNubConnection'),
    WebSocketConnection: require('./lib/transport/websocket/WebSocketConnection')
  }
};

// register all transports at the TransportManager
exports.TransportManager.registerType(exports.transport.AMQPTransport);
exports.TransportManager.registerType(exports.transport.DistribusTransport);
exports.TransportManager.registerType(exports.transport.HTTPTransport);
exports.TransportManager.registerType(exports.transport.LocalTransport);
exports.TransportManager.registerType(exports.transport.PubNubTransport);
exports.TransportManager.registerType(exports.transport.WebSocketTransport);

exports.system = require('./lib/system');

exports.util = require('./lib/util');
