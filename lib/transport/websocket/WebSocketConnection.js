'use strict';

var uuid = require('node-uuid');
var Promise = require('promise');
var WebSocket = (typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined') ?
    window.WebSocket :
    require('ws');

var Connection = require('../Connection');


/**
 * A websocket connection.
 * @param {WebSocketTransport} transport
 * @param {string | number | null} url  The url of the agent. The url must match
 *                                      the url of the WebSocket server.
 *                                      If url is null, a UUID id is generated as url.
 * @param {function} receive
 * @constructor
 */
function WebSocketConnection(transport, url, receive) {
  this.transport = transport;
  this.url = url || uuid.v4();
  this.receive = receive;

  this.sockets = {};

  // ready state
  this.ready = Promise.resolve(this);
}

/**
 * Send a message to an agent.
 * @param {string} to   The WebSocket url of the receiver
 * @param {*} message
 * @return {Promise} Returns a promise which resolves when the message is sent,
 *                   and rejects when sending the message failed
 */
WebSocketConnection.prototype.send = function (to, message) {
  //console.log('send', this.url, to, message); // TODO: cleanup

  // deliver locally when possible
  if (this.transport.localShortcut) {
    var agent = this.transport.agents[to];
    if (agent) {
      try {
        agent.receive(this.url, message);
        return Promise.resolve();
      }
      catch (err) {
        return Promise.reject(err);
      }
    }
  }

  // get or create a connection
  var conn = this.sockets[to];
  if (conn) {
    try {
      if (conn.readyState == conn.CONNECTING) {
        // the connection is still opening
        return new Promise(function (resolve, reject) {
          conn.onopen.callback.push(function () {
            conn.send(JSON.stringify(message));
            resolve();
          })
        });
      }
      else if (conn.readyState == conn.OPEN) {
        conn.send(JSON.stringify(message));
        return Promise.resolve();
      }
      else {
        // remove the connection
        conn = null;
      }
    }
    catch (err) {
      return Promise.reject(err);
    }
  }

  if (!conn) {
    // try to open a connection
    var me = this;
    return new Promise(function (resolve, reject) {
      me._connect(to, function (conn) {
        conn.send(JSON.stringify(message));
        resolve();
      }, function (err) {
        reject(new Error('Failed to connect to agent "' + to + '"'));
      });
    })
  }
};

/**
 * Open a websocket connection
 * @param {String} to   Url of the remote agent
 * @param {function} callback
 * @param {function} errback
 * @returns {WebSocket}
 * @private
 */
WebSocketConnection.prototype._connect = function (to, callback, errback) {
  var me = this;

  var conn = new WebSocket(to + '?id=' + this.url);

  // register the new socket
  me.sockets[to] = conn;

  conn.onopen = function () {
    conn.onopen.callbacks.forEach(function (cb) {
      cb(conn);
    });
    conn.onopen.callbacks = [];
  };
  conn.onopen.callbacks = [callback];

  conn.onmessage = function (event) {
    me.receive(to, JSON.parse(event.data));
  };

  conn.onclose = function () {
    delete me.sockets[to];
    //console.log('Connection closed');
    // TODO: implement auto reconnect
  };

  conn.onerror = function (err) {
    delete me.sockets[to];
    //console.log('Error: ' + err);
    // TODO: implement auto reconnect
    errback(err);
  };

  return conn;
};

/**
 * Register a websocket connection
 * @param {String} from       Url of the remote agent
 * @param {WebSocket} conn    WebSocket connection
 * @returns {WebSocket}       Returns the websocket itself
 * @private
 */
WebSocketConnection.prototype._onConnection = function (from, conn) {
  var me = this;

  conn.onmessage = function (event) {
    me.receive(from, JSON.parse(event.data));
  };

  conn.onclose = function () {
    // remove this connection from the sockets list
    delete me.sockets[from];
  };

  conn.onerror = function (err) {
    // TODO: what to do with errors?
    delete me.sockets[from];
  };

  if (this.sockets[from]) {
    // there is already a connection open with remote agent
    // TODO: what to do with overwriting existing sockets?
    this.sockets[from].close();
  }

  // register new connection
  this.sockets[from] = conn;

  return conn;
};

/**
 * Close the connection. All open sockets will be closed and the agent will
 * be unregistered from the WebSocketTransport.
 */
WebSocketConnection.prototype.close = function () {
  // close all connections
  for (var id in this.sockets) {
    if (this.sockets.hasOwnProperty(id)) {
      this.sockets[id].close();
    }
  }
  this.sockets = {};

  delete this.transport.agents[this.url];
};

module.exports = WebSocketConnection;
