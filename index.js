exports.Agent = require('./lib/Agent');

exports.ServiceManager = require('./lib/ServiceManager');
exports.TransportManager = require('./lib/TransportManager');

exports.module = {
  BabbleModule: require('./lib/module/BabbleModule'),
  PatternModule: require('./lib/module/PatternModule'),
  RequestModule: require('./lib/module/RequestModule')
};

exports.transport = {
  Transport:          require('./lib/transport/Transport'),
  LocalTransport:     require('./lib/transport/local/LocalTransport'),
  PubNubTransport:    require('./lib/transport/pubnub/PubNubTransport'),
  AMQPTransport:      require('./lib/transport/amqp/AMQPTransport'),
  DistribusTransport: require('./lib/transport/distribus/DistribusTransport'),
  HttpTransport:      require('./lib/transport/http/HttpTransport'),
  
  connection: {
    Connection:          require('./lib/transport/Connection'),
    LocalConnection:     require('./lib/transport/local/LocalConnection'),
    PubNubConnection:    require('./lib/transport/pubnub/PubNubConnection'),
    AMQPConnection:      require('./lib/transport/amqp/AMQPConnection'),
    DistribusConnection: require('./lib/transport/distribus/DistribusConnection'),
    HttpConnection:      require('./lib/transport/http/HttpConnection')
  }
};

exports.system = require('./lib/system');
