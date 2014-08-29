var eve = require('../../index');

/**
 * CalcAgent can evaluate expressions
 * @param {String} id
 * @param {ServiceManager} [services]
 * @constructor
 * @extend eve.Agent
 */

eve.system.load({
  transport: [{
    id: "myDistribus",  // optional
    type:"distribus",   // id if no id available
    port:8000,
    default: false
  },
  {
    id: "pubnubID",  // optional
    type:"distribus",   // id if no id available
    port:8000,
    default: false
  }
  ]
})


function CalcAgent(id,dist) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with support for requests
  this.extend('request'); // mixin op this
  this.rpc = this.extendTo("rpc", {settings:{}}); // mixin in object dat gereturned wordt
  this.babble = this.extendTo("babble");

  var dist = this.connect("myDistribus");
  dist.ready.then()
  this.disconnect("myDistribus");

  this.connect(distribus);  // distribus = new Transport.Distribus({})
  this.disconnect(distribus);

  // nog niet bekeken, gaat niet meer op als we this.myDB1.send gebruiken??
  this.send("pietje" , {method:"",params:{}}); // over default
  this.send("pietje@myDistribus", {method:"",params:{}});
  this.send("distribus://networkKey/jack", {method:"",params:{}});
  this.send({id:'jack', transport:"distribus", networkKey:"key"}, {method:"",params:{}});

  this.send("pietje" , {method:"",params:{}}); // over default

  var url = eve.system.transports.get("myDistribus").getURL("pietje");
  var url2 = eve.system.transports.getByType("myDistribus");
  url2[0].getURL("pietje")
  var url = dist.getURL('pietje')

}

// extend the eve.Agent prototype
CalcAgent.prototype = Object.create(eve.Agent.prototype);
CalcAgent.prototype.constructor = CalcAgent;

/**
 * Handle incoming messages.
 * Expects messages to be an object with properties fn, a, and b.
 * Available functions: 'add', 'subtract', 'multiply', 'divide'.
 * @param {String} from
 * @param {{fn: string, a: number, b: number, id: string}} message
 */
CalcAgent.prototype.receive = function(from, message) {

  if (typeof message === 'object' && 'fn' in message && 'a' in message && 'b' in message) {
    switch(message.fn) {
      case 'add':       return message.a + message.b;
      case 'subtract':  return message.a - message.b;
      case 'multiply':  return message.a * message.b;
      case 'divide':    return message.a / message.b;
      default:
        throw new Error('Unknown function "' + message.fn + '"');
    }
  }
  else {
    throw new Error('Object expected with properties fn, a, and b');
  }
};

/**
 * Destroy the agent, disconnect from all connected transports
 */
CalcAgent.prototype.destroy = function() {
  this.disconnect();
};

module.exports = CalcAgent;
