var MessageBus = require('./MessageBus');

/**
 * Use pubnub as message bus
 * @param {Object} config   Must contain properties publish_key and subscribe_key
 * @param {function} [callback]   Optional callback called when the message bus
 *                                is ready.
 * @constructor
 */
function PubNubMessageBus(config, callback) {
  this.pubnub = PUBNUB().init(config);

  if (callback) callback();
}

PubNubMessageBus.prototype = new MessageBus();

/**
 * Connect a peer
 * @param {String} id
 * @param {Function} onMessage    Invoked as onMessage(message [, data])
 * @param {Function} [onConnect]  Invoked when peer is connected, invoked as
 *                                onConnect()
 */
PubNubMessageBus.prototype.connect = function connect (id, onMessage, onConnect) {
  this.pubnub.subscribe({
    channel: id,
    message: function (message) {
      if ('data' in message) {
        onMessage(message.from, message.message, message.data);
      }
      else {
        onMessage(message.from, message.message);
      }
    },
    connect: onConnect
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
 * @param {*} [data]
 */
PubNubMessageBus.prototype.send = function send (from, to, message, data) {
  this.pubnub.publish({
    channel: to,
    message: {
      from: from,
      to: to,
      message: message,
      data: data
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
