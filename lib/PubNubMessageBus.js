var Promise = require('promise');
var MessageBus = require('./MessageBus');

/**
 * Use pubnub as message bus
 * @param {Object} config   Must contain properties publish_key and subscribe_key
 * @constructor
 */
function PubNubMessageBus(config) {
  this.pubnub = PUBNUB().init(config);
}

PubNubMessageBus.prototype = new MessageBus();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage                  Invoked as onMessage(from, message)
 * @return {Promise.<PubNubMessageBus, Error>}  Returns a promise which resolves when
 *                                              connected.
 */
PubNubMessageBus.prototype.connect = function connect (id, onMessage) {
  var me = this;
  return new Promise(function (resolve, reject) {
    me.pubnub.subscribe({
      channel: id,
      message: function (message) {
        onMessage(message.from, message.message);
      },
      connect: function () {
        resolve(me);
      }
    });
  });
};

/**
 * Disconnect a peer by its id
 * @param {String} id
 */
PubNubMessageBus.prototype.disconnect = function disconnect (id) {
  this.pubnub.unsubscribe({
    channel: id
  });
};

/**
 * Send a message to a peer
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
PubNubMessageBus.prototype.send = function send (from, to, message) {
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

module.exports = PubNubMessageBus;
