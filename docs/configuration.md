# Configuration

Evejs has a default [`ServiceManager`](api.md#servicemanager) loaded at `eve.system`. 
This service manager is loaded with a `LocalTransport`, allowing local agents to 
communicate with each other without need for additional configuration.

The default service manager can be configured like:

```js
var eve = require('evejs');
var HelloAgent = require('./examples/agents/HelloAgent');

// configure eve
eve.system.init({
  transports: [
    {
      type: 'distribus',
    }
  ],
  timer: {
    rate: 'discrete'
  }
});

// create two agents
var agent1 = new HelloAgent('agent1');
var agent2 = new HelloAgent('agent2');

agent2.sayHello('agent1');
```

Configuration can be saved in a separate configuration file like **config.json**:

```json
{
  "transports": [
    {
      "type": "distribus"
    }
  ],
  "timer": {
    "rate": "discrete"
  }
}
```

And loaded like:

```
var eve = require('evejs');

var config = require('./config.json');
eve.system.init(config);
```


## Transports

One or multiple transports can be configured for the ServiceManager:

```js
eve.system.init({
  transports: [
    {
      type: 'distribus'
    },
    {
      type: 'ws',
      url: 'ws://localhost:3000/agents/:id'
    },
    ...
  ]
});
```

All transports and their configuration options are described on the page [Transports](transports.md).



## Timer

The ServiceManager comes with a configurable timer, which can be used to run 
simulations in discrete time or hyper time. Evejs uses 
[hypertimer](https://github.com/enmasseio/hypertimer) for this. By default,
the timer runs in real-time.

To configure the default timer: 

```js
eve.system.init({
  timer: {
    rate: 'discrete',     // a number or 'discrete'
    deterministic: true,  // true or false.
  }
});
```

The timer has functions `setTimeout`, `setInterval`, `setTrigger`, `setTime`,
`getTime`, and more. To use the timer:

```js
var delay = 1000;
eve.system.timer.setTimeout(function () {
  console.log('hello world!');
}, delay)
```


## Random

The [ServiceManager](api.md#servicemanager) contains a `random` function. 
This function returns a random value between 0 (inclusive) and 1 (exclusive).
The function defaults to the built in `Math.random` function. For simulations,
the function can be configured to a deterministic one for reproducible execution. 
The [`seed-random`](https://github.com/ForbesLindesay/seed-random) module
is used for this.

To configure the random function:

```js
eve.system.init({
  random: {
    deterministic: true,  // false by default
    seed: 'my seed'       // optional, 'random seed' by default.
  }
});
```

Usage:

```js
var value = eve.system.random(); // get a random value between 0 and 1
```

Available properties:

- `deterministic: boolean`  
  When false, the non-deterministic `Math.random` is used. When true, a 
  deterministic `random` function is used.

- `seed: string`  
  Optional. A custom seed for the deterministic random function. 
  Only applicable when property `deterministic` is true, and `entropy` is false.

- `global: boolean`  
  Optional. false by default. When true, the global `Math.random` will be
  overwritten by the deterministic one.
  Only applicable when property `deterministic` is true.
  
- `entropy: boolean`  
  Optional, false by default. If true, a seed is automatically generated from
  local data. Only applicable when property `deterministic` is true.
