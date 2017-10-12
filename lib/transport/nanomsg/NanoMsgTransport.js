'use strict';

var Transport = require('./../Transport');
var NanoMsgConnection = require('./NanoMsgConnection');

/**
 * Use nanomsg as transport
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 *                                - `url: string`, required, local binding address
 * @constructor
 */
function NanoMsgTransport(config) {

  this.id = config && config.id || null;
  this.config = config || false;
  this.connection = null;
}


NanoMsgTransport.prototype = new Transport();
NanoMsgTransport.prototype.type = 'nanomsg';

/**
 */
NanoMsgTransport.prototype.connect = function (id, receive) {
  this.connection = new NanoMsgConnection(this, id, receive);
  return this.connection;
};

/**
 * Close the transport.
 */
NanoMsgTransport.prototype.close = function () {
  //Close connection
  if (this.connection) {
    this.connection.close();
  }
  this.connection = null;
};

module.exports = NanoMsgTransport;
