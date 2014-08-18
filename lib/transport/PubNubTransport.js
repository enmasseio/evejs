var Promise = require('promise');
var Transport = require('./Transport');

/**
 * Use pubnub as transport
 * @param {Object} config   Must contain properties publish_key and subscribe_key
 * @constructor
 */
function PubNubTransport(config) {
  this.pubnub = PUBNUB().init(config);
}

PubNubTransport.prototype = new Transport();

PubNubTransport.prototype.type = 'pubnub';

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive                    Invoked as receive(from, message)
 * @return {Promise.<PubNubTransport, Error>}  Returns a promise which resolves when
 *                                              connected.
 */
PubNubTransport.prototype.connect = function(id, receive) {
  var me = this;
  return new Promise(function (resolve, reject) {
    me.pubnub.subscribe({
      channel: id,
      message: function (message) {
        receive(message.from, message.message);
      },
      connect: function () {
        resolve(me);
      }
    });
  });
};

/**
 * Disconnect an agent by its id
 * @param {String} id
 */
PubNubTransport.prototype.disconnect = function(id) {
  this.pubnub.unsubscribe({
    channel: id
  });
};

/**
 * Send a message to an agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed agent
 * @param {String} message
 */
PubNubTransport.prototype.send = function(from, to, message) {
  this.pubnub.publish({
    channel: to,
    message: {
      from: from,
      to: to,
      message: message
    }
  });
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
