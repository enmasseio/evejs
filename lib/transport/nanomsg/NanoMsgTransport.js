'use strict';

var Transport = require('./../Transport');
var NanoMsgConnection = require('./NanoMsgConnection');
var staticCounter=0;

/**
 * Use nanomsg as transport
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 *                                - `url: string`, required, local binding address
 * @constructor
 */
function NanoMsgTransport(config) {

  var createUrl = function(config, id){
    if (!config){
      return "inproc://"+id;
    }
    if (config.port && config.interface){
      return "tcp://"+config.interface+":"+config.port;
    } else if (config.baseport && config.interface){
      return "tcp://"+config.interface+":"+(config.baseport+(staticCounter++));
    } else if (config.url){
      return config.url.replace("nanomsg:","").replace(":id",id);
    } else {
      return "inproc://"+id;
    }
  };


  this.id = config && config.id || null;
  this.config = config || false;

  this.url = createUrl(config,this.id);
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
