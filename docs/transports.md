# Transports

Evejs has the following built-in transports:

- [AMQP](#amqp)
- [Distribus](#distribus)
- [HTTP](#http)
- [Local](#local)
- [PubNub](#pubnub)
- [WebSocket](#websocket)


## AMQP

[AMQP](http://www.amqp.org/) (Advanced Message Queuing Protocol) is an open standard application layer protocol for message-oriented middleware. The defining features of AMQP are message orientation, queuing, routing (including point-to-point and publish-and-subscribe), reliability and security.

To configure an AMQP transport in evejs: 

```js
eve.system.init({
  transports: [
    {
      type: 'amqp',
      id: 'myAmqp',               // optional identifier for the transport
      url: 'amqp://localhost',    // specify either url or host
      host: 'dev.rabbitmq.com'    // specify either url or host
    }
   ]
});
```

Available properties:

- `type: 'amqp'`  
  Required. Specifies the type of transport.
- `id: string`  
  Optional.
- `url: string`  
  The url of an AMQP server. Either `url` or `host` must be specified.
- `host: string`  
  The host address of an AMQP server. Either `url` or `host` must be specified.


## Distribus

Distribus is a scalable, distributed message bus for node.js and the browser. One or multiple hosts are connected to each other in a peer-to-peer network. Peers can be connected to any of the hosts in the network, and then send messages to each other by their id.

To configure a Distribus transport: 

```js
eve.system.init({
  transports: [
    {
      type: 'distribus',
      id: 'myDistribus',     // optional identifier for the transport
      host: distribus.Host   // instance of a distribus Host, or...
      port: number           // ...a port number to start a new distribus host
    }
   ]
});
```

Available properties:

- `type: 'distribus'`  
  Required. Specifies the type of transport.
- `id: string`  
  Optional.
- `host: distribus.Host`  
  An instance of a distribus `Host`. Optional
- `port: number`  
  A port number used to initialize a new distribus `Host`. Optional.

Either `host` or `port` can be configured. If none is provided, a local distribus `Host` is created.


## HTTP

Sending HTTP requests  is a simple, robust, and scalable way to send messages between agents. The messages are received by a web server, and dispatched to the correct recipient. HTTP can be relatively slow (compared to for example [WebSocket](#websocket)) due to the network latency with every request.

To use the HTTP transport with the Eve transport manager you define the type and its settings. 

```js
eve.system.init({
  transports: [
    {
      type: 'http',
      id: 'myAmqp',  // optional identifier for the transport
      port: 3000,
      url: 'http://127.0.0.1:3000/agents/:id',
      remoteUrl: 'http://127.0.0.1:3000/agents/:id',
      localShortcut: false,
    }
   ]
});
```

Mandatory:

- `type: 'http'`  
  Required. The type is a mandatory field for the TransportManager to identify the specific transport you want to add. In this case it is 'http'.
- `url: String`  
  Required. This is the URL of the server. This is where and how incoming messages are received. The ':id' will be replaced with the agent id of the targeted agent.
- `id: string`  
  Optional. An id, used to find a specific transport by it's id in the ServiceManager.
- `port: Number`  
  Optional. The port number the HTTP server should listen on. This is optional **IF** you also define a port number in the `url`, which will then be parsed.
- `remoteUrl: String`  
  Optional. This field is optional. It is be used to automatically create an address. If you have agents "agent1" and "agent2" and you want to send a message from 1 to 2 using `agent1.send("agent2","hello!")` an error will be thrown if no remoteUrl is defined. By using the remoteUrl, an address (in this case http://127.0.0.1:3000/agents/agent1) will be generated. This is particularly useful if you're only using HTTP to bridge to one other platform or service.
- `localShortcut: Boolean`  
  Optional. This option when true, will check if the recipient of a message exists in the same server as the sender. If this is the case, the message is delivered locally, increasing performance. The default value is `true`.


#### Local

The fastest and simplest transport is the local transport. There is a local map with registered recipients, and sent messages are immediately dispatched on the receive method of the recipient. This transport can only be used to send messages between agents running in the same process.

To configure a local transport: 

```js
eve.system.init({
  transports: [
    {
      type: 'local',
      id: 'myLocalTransport', // optional identifier for the transport
    }
   ]
});
```

Available properties:

- `type: 'local'`  
  Required. Specifies the type of transport.
- `id: string`  
  Optional.


## PubNub

[PubNub](http://www.pubnub.com) offers a scalable publish/subscribe network. 

To configure a PubNub transport: 

```js
eve.system.init({
  transports: [
    {
      type: 'pubnub',
      id: 'myPubnub',         // optional identifier for the transport
      publish_key: 'demo',    // required
      subscribe_key: 'demo',  // required
    }
   ]
});
```

Available properties:

- `type: 'pubnub'`  
  Required. Specifies the type of transport.
- `id: string`  
  Optional.
- `publish_key: string`   
  Required.
- `subscribe_key: string`  
  Required. 

A `publish_key` and `subscribe_key` can be acquired by creating an account at http://pubnub.com.


## WebSocket

The WebSocket transport allows to open a WebSocket connection between two individual agents. It's a fast but only usable for small amounts of agents, as only a limited amount of WebSockets can be opened at a time. Use [Distibus](#distribus) when WebSocket connection is needed dealing with lots of agents: Distribus opens a single WebSocket between each pair of processes, and sends the messages of all agents via this single socket.

To configure a WebSocket transport: 

```js
eve.system.init({
  transports: [
    {
      type: 'ws',
      id: 'myWebSocket',                        // optional identifier
      url: 'ws://localhost:3000/agents/:id',    // optional url with id placeholder
      localShortcut: true
    }
   ]
});
```

A WebSocket can be used both server side as well as client side (browser).
When `url` is provided, a WebSocket server is started. and agents can connect to
this server. When a WebSocket transport has no url, it cannot be as server but
only as client, connecting to other servers. Once a connection is made between
two agents, they can both send messages to each other.
 
Available properties:

- `type: 'ws'`  
  Required. Specifies the type of transport.
- `id: string`    
  Optional identifier for this transport.
- `url: string`
  Optional. If provided, A WebSocket server is started on given url.
  The url must contain a `:id` placeholder to build urls for individual agents.
  Example: `'ws://localhost:3000/agents/:id'`.
- `localShortcut: boolean`
  Optional. If true, messages to local agents are not send via WebSocket but 
  delivered immediately. Setting `localShortcut` to `false` can be useful for
  debugging and testing purposes.
- `reconnectDelay: boolean`  
  Optional. Delay in milliseconds for reconnecting a broken connection. 
  10000 ms by default. Connections are only automatically reconnected after 
  there has been an established connection.
