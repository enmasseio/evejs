/**
 * Created by Luis F. M. Cunha on 6-7-17.
 */

/**
 * Custom agent prototype
 * @param {String} id
 * @param {String} polePosition
 * @constructor
 * @extend eve.Agent
 */
function Pole(id, polePosition) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());

  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', this.rpcFunctions, {timeout:20000});

  this.me = id;
  this.polePosition = {
    cx:polePosition.cx,
    cy:polePosition.cy
  };


}

// extend the eve.Agent prototype
Pole.prototype = Object.create(eve.Agent.prototype);
Pole.prototype.constructor = Pole;

// Creates rpcFunctions object
Pole.prototype.rpcFunctions = {};

// Updates the position of the car
Pole.prototype.rpcFunctions.updateLight = function(light){
  document.getElementById(this.me).style.opacity = (light.intensity / 100.0) + 0.05;
}

Pole.prototype.receive = function (from, reply) {
  console.log("received: " + reply);
}
