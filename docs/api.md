# API

The `evejs` library contains the following:

- [`eve.Agent`](#agent)
- `eve.system` a default, global instance of a service manager, 
  loaded with a `LocalTransport`.
- [`eve.ServiceManager`](#servicemanager) construct a service manager.
- [`eve.TransportManager`](#transportmanager) construct a service manager.
- `eve.module.BabbleModule`
- `eve.module.PatternModule`
- `eve.module.RequestModule`
- `eve.module.RPCModule`
- [`eve.transport.Transport`](#transport) (abstract prototype)
- `eve.transport.AMQPTransport` using the [AMPQ](http://www.amqp.org/) protocol,
  for example via [RabbitMQ](https://www.rabbitmq.com/) servers.
- `eve.transport.DistribusTransport` using [distribus](https://github.com/enmasseio/distribus).
- `eve.transport.HTTPTransport` for messaging over http,
- `eve.transport.LocalTransport` using a local, in process transport.
- `eve.transport.PubNubTransport` using [PubNub](http://www.pubnub.com/).
- `eve.transport.WebSocketTransport` using web sockets.
- [`eve.transport.connection.Connection`](#connection) (abstract prototype)
- `eve.transport.connection.AMQPConnection`
- `eve.transport.connection.DistribusConnection`
- `eve.transport.connection.HTTPConnection`
- `eve.transport.connection.LocalConnection`
- `eve.transport.connection.PubNubConnection`
- `eve.transport.connection.WebSocketConnection`
- `eve.util` containing some utility functions.


## Agent

Constructor:

```js
var agent = new eve.Agent([id: string]);
```

Properties:

- `Agent.ready : Promise`  
  A promise which resolves when all connections of the agent are ready.

Methods:

- `Agent.send(to: string, message: string) : Promise`  
  Send a message to an other agent. Returns a promise which resolves when the
  message has been send. Parameter `to` is either:
  
  - A string "agentId", the id of the recipient. Will be send
    via the default transport or when there is no default
    transport via the first connected transport.
  - A string "protocol://networkId/agentId". This is a sharable
    identifier for an agent.

- `Agent.extend(module: string | Array.<string> [, options: Object]): Agent`  
  Extend an agent with modules (mixins). Available modules: 
  - `'pattern'`  
    Add support for pattern listening to an object. The agent will be extended
    with functions `listen` and `unlisten`. Cannot be used in conjunction with
    module `'babble'`.
  
  - `'request'`  
    Add support for sending requests and immediately retrieving a reply. The 
    agent will be extended with a function `request`.
  
  - `'babble'`  
    Babblify an agent. The babblified agent will be extended with functions
    `ask`, `tell`, and `listen`. Cannot be used in conjunction with
    module `'pattern'`.
  
  The function `extend` returns the agent itself, which allows chaining multiple
  extenstions.

- `Agent.loadModule(module: string | Array.<string> [, options: Object]): Module`  
  Load a module for an agent. This is the same as `Agent.extend`, except that 
  the functions offered by the module are not attached to the Agent itself, but
  returned as object. This allows storing the new functions in a separate 
  namespace, preventing conflicts between modules or the agent itself. 

- `Agent.receive(from: string, message: string)`  
  Receive a message from an agent. The method should be overloaded with an
  implementation doing something with incoming messages.

- `Agent.connect(transport: Transport | Transport[] | string | string[] [, id: string]) : Promise<Agent, Error>`  
  Connect the agent to a transport instance or the id of a transport loaded 
  in `eve.system`. Parameter `transport` can be an Array to connect to multiple
  transports at once. Eve comes with multiple message transport implementations 
  (see [Transports](transports.md). 
  By default, the agent connects to the transport with it's 
  own id. It is possible to provide an alternative id instead by specifying
  this as second argument.

- `Agent.disconnect([transport: Transport | Transport[] | string | string[]])`  
  Disconnect the agent from a transport or multiple transports. When parameter
  `transport` is not provided, the agent will be disconnected from all 
  transports.

Static methods:

- `Agent.registerModule(constructor: Function)`
  A static function to register a new type of module. This module can then 
  be loaded via `Agent.extend()` and `Agent.loadModule()`.


## ServiceManager

A ServiceManager is an object to manage services for the agents. Currently,
the only available service is transports. Typically, a service manager is 
provided to an agent on construction, allowing the agent to connect to relevant 
services.

A ServiceManager is created as:

```js
var services = new eve.ServiceManager();
var services = new eve.ServiceManager(config: Object);
```

Where `config` is an optional JSON object structured as:

```js
{
  "transports": [
    {
      "type": STRING,
      ... transport dependent params
    },
    ...
  ],
  "timer": {
    "rate": NUMBER | "discrete"
  },
  "random": {
    "deterministic": BOOLEAN
  }
}
```

Properties:

- `transports: TransportManager` see [TransportManager](#transportmanager)
- `timer: hypertimer` see [Timer](configuration.md#timer)
- `random: function` see [Random](configuration.md#random)

Methods:

- `clear()`  
  Close all configured services and remove them from the manager.
- `init(config: Object)`  
  Initialize the service manager with services loaded from a configuration
  object. All current services are unloaded and removed.



## TransportManager

A TransportManager manages transports for reuse by multiple agents.

A TransportManager is created as:

```js
var services = new eve.TransportManager();
var services = new eve.TransportManager(config: Array);
```

Where `config` is an optional JSON array structured as:

```js
[
  {
    "type": STRING,
    ... transport dependent params
  },
  ...
]
```

Available types: `"amqp"`, `"distribus"`, `"local"`, `"pubnub"` and `"http"`.
The configuration for all available transports is described in detail on the
page [Transports](transports.md).

Methods:

- `add(transport: Transport) : Transport`  
  Add a loaded transport to the manager. Returns the transport itself.
- `clear()`  
  Close all configured transports and remove them from the manager.
- `get(id: string) : Transport`  
  Get a single transport by it's id.
  Throws an error when no matching transport is found.
- `getAll() : Transport[]`  
  Get all transports.
- `getByType([type: string]) : Transport[]`  
  Get transports. When optional parameter `type` is provided, the transports
  are filtered by this type. When there are no transports found, an empty 
  array is returned.
  Available types are: 'amqp',  'distribus', 'local', 'pubnub'.
- `load(config: Object) : Transport`  
  Load a transport based on JSON configuration. Returns the loaded transport

Static methods:

- `TransportManager.registerType(constructor: Function)`
  A static function to register a new type of transport. This transport can then 
  be loaded via configuration. When called, the constructor must generate a 
  transport which is an instance of `Transport`.


## Transport

The library provides multiple `Transport` implementations: `LocalTransport`,
`PubNubTransport`, `AMQPTransport`, and `DistribusTransport`. It is quite 
easy to implement a support for other messaging services.

`Transport` has the following API:

Constructor:

```js
var transport = new Transport([config: Object]);
```

Methods:

- `Transport.connect(id: string, receive: Function) : Connection`    
  Connect an agent with given `id`. When a message for the agent comes in,
  the callback function `receive` is invoked as `receive(from: string,
  message: string)`. The method returns a [`Connection`](#connection), which
  can be used to send messages.

- `Transport.close() : Connection`    
  Close a transport. For example in case of an `HTTPTransport`, the server
  will be closed.


## Connection

When a connection is opened by a [`Transport`](#transport), a `Connection` is 
returned.

Constructor:

```js
var connection = new Connection(transport: Transport, id: string, receive: function);
```

Properties:

- `Transport.ready: Promise`  
  The ready state of the transport. When ready, the properties Promise resolves.

Methods:

- `Transport.close()`  
  Close the connection.
- `Transport.send(to: string, message: string) : Promise`  
  Send a message via the transport.
