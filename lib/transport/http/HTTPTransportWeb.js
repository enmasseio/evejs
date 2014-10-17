'use strict';

var http = require('http');
var Promise = require('promise');
var Transport = require('./../Transport');
var HTTPConnection = require('./HTTPConnection');
var uuid = require('uuid-v4');

/**
 * HTTP Transport layer:
 *
 * Supported Options:
 *
 * {Number}  config.port              Port to listen on.
 * {String}  config.path              Path, with or without leading and trailing slash (/)
 * {Boolean} config.localShortcut     If the agentId exists locally, use local transport. (local)
 *
 * Address: http://127.0.0.1:PORTNUMBER/PATH
 */
function HTTPTransport(config) {
  this.id = config && config.id || null;
  this.networkId = null;

  this.agents = {};
  this.outstandingRequests = {}; // these are received messages that are expecting a response
  this.outstandingMessages = {};

  this.url =  config && config.url || "http://127.0.0.1:3000/agents/:id";
  this.remoteUrl =  config && config.remoteUrl;
  this.localShortcut = (config && config.localShortcut === false) ? false : true;

  this.httpTimeout =         config && config.httpTimeout         || 2000; // 1 second - timeout to send message
  this.httpResponseTimeout = config && config.httpResponseTimeout || 200;  // 0.5 second - timeout to expect reply after delivering request
  this.regexHosts = /[http]{4}s?:\/\/([a-z\-\.A-Z0-9]*):?([0-9]*)(\/[a-z\/:A-Z0-9._\-% \\\(\)\*\+\.\^\$]*)/;
  this.urlHostData = this.regexHosts.exec(this.url);

  this.regexPath = this.getRegEx(this.urlHostData[3]);
  this.port = config && config.port || this.urlHostData[2] || 3000;
  this.path = this.urlHostData[3].replace(':id', '');
}

HTTPTransport.prototype = new Transport();
HTTPTransport.prototype.type = 'http';

HTTPTransport.prototype.getRegEx = function(url) {
  return new RegExp(url.replace(/[\\\(\)\*\+\.\^\$]/g,function(match) {return '\\' + match;}).replace(':id','([:a-zA-Z_0-9]*)'));
};


/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive  Invoked as receive(from, message)
 * @return {HTTPConnection}   Returns a connection.
 */
HTTPTransport.prototype.connect = function(id, receive) {
  this.outstandingRequests[id] = {};
  this.outstandingMessages[id] = {};
  return new HTTPConnection(this, id, receive);
};

/**
 * Send a message to an agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
HTTPTransport.prototype.send = function(from, to, message) {
  var me = this;
  return new Promise(function (resolve,reject) {
    if (typeof message == 'object') {
      message = JSON.stringify(message)
    }
    var fromRegexpCheck = me.regexPath.exec(from);
    var fromAgentId = fromRegexpCheck[1];

      // create XMLHttpRequest object to send the POST request
    var http = new XMLHttpRequest();

    // insert the callback function. This is called when the message has been delivered and a response has been received
    http.onreadystatechange = function () {
      if (http.readyState == 4 && http.status == 200) {
        me.agents[fromAgentId](to, parsedResponse);
        // launch callback function
        resolve();
      }
      else if (http.readyState == 4 && http.status != 200) {
        console.log("Make sure that the Node server has started.");
      }
    };

    // open an asynchronous POST connection
    http.open("POST", to, true);
    // include header so the receiving code knows its a JSON object
    http.setRequestHeader("Content-type", "application/json");
    // send
    http.send(POSTrequest);
  });
};


/**
 *  Close the HTTP server
 */
HTTPTransport.prototype.close = function() {
  // close all open connections
  for (var agentId in this.outstandingRequests) {
    if (this.outstandingRequests.hasOwnProperty(agentId)) {
      var agentRequests = this.outstandingRequests[agentId];
      for (var messageId in agentRequests) {
        if (agentRequests.hasOwnProperty(messageId)) {
          var openMessage = agentRequests[messageId];
          var error = new Error('Server shutting down.');
          openMessage.response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
        }
      }
    }
  }
  // close server
  if (this.server) {
    this.server.close();
  }
  this.server = null;
};


module.exports = HTTPTransport;

