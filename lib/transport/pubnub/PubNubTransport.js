var Transport = require('./../Transport');
var PubNubConnection = require('./PubNubConnection');

/**
 * Use pubnub as transport
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 *                                - `publish_key: string`. Required
 *                                - `subscribe_key: string`. Required
 * @constructor
 */
function PubNubTransport(config) {
  this.id = config && config.id || null;
  this['default'] = config && config['default'] || false;
  this.pubnub = PUBNUB().init(config);
}

PubNubTransport.prototype = new Transport();

PubNubTransport.prototype.type = 'pubnub';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive  Invoked as receive(from, message)
 * @return {PubNubConnection} Returns a connection
 */
PubNubTransport.prototype.connect = function(id, receive) {
  return new PubNubConnection(this, id, receive)
};

/**
 * Load the PubNub library
 * @returns {Object} PUBNUB
 */
function PUBNUB() {
  if (typeof window !== 'undefined') {
    // browser
    if (typeof window['PUBNUB'] === 'undefined') {
      throw new Error('Please load pubnub first in the browser');
    }
    return window['PUBNUB'];
  }
  else {
    // node.js
    return require('pubnub');
  }
}

module.exports = PubNubTransport;
