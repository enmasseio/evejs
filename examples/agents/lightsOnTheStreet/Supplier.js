/**
 * Created by Luis F. M. Cunha on 6-7-17.
 */
/**
 * Custom agent prototype
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function Supplier(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());

  this.me = id;

}

// extend the eve.Agent prototype
Supplier.prototype = Object.create(eve.Agent.prototype);
Supplier.prototype.constructor = Supplier;

/**
 */
Supplier.prototype.receive = function() {

};
