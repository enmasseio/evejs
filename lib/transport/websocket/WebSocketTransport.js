'use strict';

var urlModule = require('url');
var Promise = require('promise');
var WebSocketServer = require('ws').Server;

var Transport = require('./../Transport');
var WebSocketConnection = require('./WebSocketConnection');

/**
 * Create a web socket transport.
 * @param {Object} config         Config can contain the following properties:
 *                                - `id: string`. Optional
 *                                - `default: boolean`. Optional
 *                                - `url: string`. Optional. If provided,
 *                                  A WebSocket server is started on given
 *                                  url.
 *                                - `localShortcut: boolean`. Optional. If true
 *                                  (default), messages to local agents are not
 *                                  send via WebSocket but delivered immediately
 * @constructor
 */
function WebSocketTransport(config) {
  this.id = config && config.id || null;
  this.networkId = this.id || null;
  this['default'] = config && config['default'] || false;
  this.localShortcut = (config && config.localShortcut === false) ? false : true;

  this.url = config && config.url || null;
  this.server = null;

  if (this.url) {
    var urlParts = urlModule.parse(this.url);
    this.address = urlParts.protocol + '//' + urlParts.host; // the url without path, for example 'ws://localhost:3000'

    this.ready = this._initServer(this.url);
  }

  this.agents = {}; // WebSocketConnections of all registered agents. The keys are the urls of the agents
}

WebSocketTransport.prototype = new Transport();

WebSocketTransport.prototype.type = 'ws';

/**
 * Build an url for given id. Example:
 *   var url = getUrl('agent1'); // 'ws://localhost:3000/agents/agent1'
 * @param {String} id
 * @return {String} Returns the url, or returns null when no url placeholder
 *                  is defined.
 */
WebSocketTransport.prototype.getUrl = function (id) {
  return this.url ? this.url.replace(':id', id) : null;
};

/**
 * Initialize a server on given url
 * @param {String} url    For example 'http://localhost:3000'
 * @return {Promise} Returns a promise which resolves when the server is up
 *                   and running
 * @private
 */
WebSocketTransport.prototype._initServer = function (url) {
  var urlParts = urlModule.parse(url);
  var port = urlParts.port || 80;

  var me = this;
  return new Promise(function (resolve, reject) {
    me.server = new WebSocketServer({port: port}, function () {
      resolve(me);
    });

    me.server.on('connection', me._onConnection.bind(me));

    me.server.on('error', function (err) {
      reject(err)
    });
  })
};

// TODO: comment
WebSocketTransport.prototype._onConnection = function (conn) {
  var url = conn.upgradeReq.url;
  var urlParts = urlModule.parse(url, true);
  var toPath = urlParts.pathname;
  var to = this.address + toPath;

  var queryParams = urlParts.query;
  var from = queryParams.id;
  //console.log('onConnection, to=', to, ', from=', from, ', agents:', Object.keys(this.agents)); // TODO: cleanup

  var agent = this.agents[to];
  if (agent) {
    agent._onConnection(from, conn);
  }
  else {
    // reject the connection
    // conn.send('Error: Agent with id "' + to + '" not found'); // TODO: can we send back a message before closing?
    conn.close();
  }
};

/**
 * Connect an agent
 * @param {string} id     The id or url of the agent. In case of an
 *                        url, this url must match the url of the
 *                        WebSocket server.
 * @param {Function} receive                  Invoked as receive(from, message)
 * @return {WebSocketConnection} Returns a promise which resolves when
 *                                                connected.
 */
WebSocketTransport.prototype.connect = function(id, receive) {
  var isURL = (id.indexOf('://') !== -1);

  var url = isURL ? id : this.getUrl(id);

  // register the agents receive function
  if (this.agents[this.url]) {
    throw new Error('Agent with id ' + this.id + ' already exists');
  }

  var conn = new WebSocketConnection(this, url, receive);
  this.agents[url] = conn;

  return conn;
};

/**
 * Close the transport. Removes all agent connections.
 */
WebSocketTransport.prototype.close = function() {
  // close all connections
  for (var id in this.agents) {
    if (this.agents.hasOwnProperty(id)) {
      this.agents[id].close();
    }
  }
  this.agents = {};

  // close the server
  if (this.server) {
    this.server.close();
  }
};

module.exports = WebSocketTransport;
