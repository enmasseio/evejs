/**
 * Created by Luis F. M. Cunha on 6-7-17.
 */

/**
 * Custom agent prototype
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function Car(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());

  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', this.rpcFunctions, {timeout:2000});

  this.me = id;

}

// extend the eve.Agent prototype
Car.prototype = Object.create(eve.Agent.prototype);
Car.prototype.constructor = Car;

Car.prototype.sayHi = function (){
  console.log("Hi from " + this.id);
}

/**
 */
Car.prototype.receive = function() {

};

// Creates rpcFunctions object
Car.prototype.rpcFunctions = {};

// updates the position of the car
Car.prototype.rpcFunctions.updatePosition = function(newX){
  document.getElementById(this.me).setAttribute("x", newX.x);
}