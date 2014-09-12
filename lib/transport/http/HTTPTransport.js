'use strict';

var http = require('http');
var Promise = require('promise');
var Transport = require('./../Transport');
var HTTPConnection = require('./HTTPConnection');

/**
 * HTTP Transport layer:
 *
 * Supported Options:
 *
 * {Number}  config.port | Port to listen on.
 * {String}  config.path | Path, with or without leading and trailing slash (/)
 * {Boolean} config.localIfAvailable | if the agentId exists locally, use local transport. (local)
 *
 * Address: http://127.0.0.1:PORTNUMBER/PATH
 */
function HTTPTransport(config) {
  this.id = config.id || null;
  this.networkId = null;

  this.agents = {};
  this.outstandingRequests = {};

  this.port = config.port || 3000;
  this.url = config.url;
  this.remoteUrl = config.remoteUrl;
  this.localShortcut = config.localShortcut || false;

  this.httpTimeout = 1000; // 1 second
  this.regexHosts = new RegExp(/[http]{4}s?:\/\/([a-z\-\.A-Z0-9]*):?([0-9]*)(\/[a-z\/:A-Z0-9._\-% \\\(\)\*\+\.\^\$]*)/);
  var path = this.regexHosts.exec(this.url)[3];
  this.regexPath = this.getRegEx(path);
}

HTTPTransport.prototype = new Transport();
HTTPTransport.prototype.type = 'http';

HTTPTransport.prototype.getRegEx = function(url) {
  return new RegExp(url.replace(/[\\\(\)\*\+\.\^\$]/g,function(match) {return '\\' + match;}).replace(':id','([:a-zA-Z_0-9]*)'));
};

/**
 * Connect an agent
 * @param {String} id
 * @param {Function} onMessage            Invoked as onMessage(from, message)
 * @return {Promise.<Transport, Error>}  Returns a promise which resolves when
 *                                        connected.
 */
HTTPTransport.prototype.connect = function(id, receive) {
  if (this.server === undefined) {
    this.initiateServer();
  }
  this.outstandingRequests[id] = {};
  return new HTTPConnection(this, id, receive);
};

/**
 * Send a message to a agent
 * // TODO: check if local shortcut is possible
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
HTTPTransport.prototype.send = function(from, to, message, receive) {
  var me = this;
  return new Promise(function (resolve,reject) {
    var hostData = me.regexHosts.exec(to);

    var regexpCheck = me.regexPath.exec(from);
    var agentId = regexpCheck[1];

    var outstanding = me.outstandingRequests[agentId];

    // TODO: check if local shortcut is possible

    if (typeof message == "object") {
      if (outstanding[message.id] !== undefined) {
        var callback = outstanding[message.id];
        clearTimeout(callback.timeout);
        callback.response.end(JSON.stringify(message));
        delete outstanding[message.id];
        return;
      }
      message = JSON.stringify(message);
    }

    // all post options
    var options = {
      host: hostData[1],
      port: hostData[2],
      path: hostData[3],
      method: 'POST',
      headers: {
        'x-eve-senderurl' : from, // used to get senderID
        'Content-type'    : 'text/plain'
      }
    };
    var request = http.request(options, function(res) {
      res.setEncoding('utf8');
      res.on('data', function (response) {
        if (receive) {
          var parsedResponse;
          try {parsedResponse = JSON.parse(response);} catch (err) {parsedResponse = response;}
          if (typeof parsedResponse == "object") {
            if (parsedResponse.__httpError__ !== undefined) {
              reject(new Error(parsedResponse.__httpError__))
              return;
            }
          }
          receive(to, parsedResponse);
          resolve();
        }
      });
    });

    request.on('error', function(e) {
      console.log('Problem with sendMessage to ' + to + ': ' + e.message);
      reject(e);
    });

    // write data to request body
    request.write(message);
    request.end();
  });
};


/**
 * This is the HTTP equivalent of receiveMessage.
 *
 * @param request
 * @param response
 */
HTTPTransport.prototype.processRequest = function(request, response) {
  var url = request.url;

  // define headers
  var headers = {};
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Credentials'] = true;
  headers['Content-Type'] = 'text/plain';

  var regexpCheck = this.regexPath.exec(url);
  if (regexpCheck !== null) {
    var agentId = regexpCheck[1];
    var senderId = 'unknown';
    if (request.headers['x-eve-senderurl'] !== undefined) {
      senderId = request.headers['x-eve-senderurl'];
    }
    var body = '';
    request.on('data', function (data) {
      body += data;
      if (body.length > 1e6) {        // 1e6 == 1MB
        request.connection.destroy(); // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
      }
    });


    var me = this;
    request.on('end', function () {
      var expectReply = false;
      var message;
      try {message = JSON.parse(body);} catch (err) {message = body;}

      // check if JSON RPC
      expectReply = message.jsonrpc && message.jsonrpc == '2.0' || expectReply;
      // check if type == 'request'
      expectReply = message.type && message.type == 'request' || expectReply;

      response.writeHead(200, headers);
      // construct callback

      var callback = me.agents[agentId];
      if (callback === undefined) {
        var error = new Error("Agent: '" + agentId + "' does not exist.");
        response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
      }
      else {
        if (expectReply == true) {
          me.outstandingRequests[agentId][message.id] = {
            response: response,
            timeout: setTimeout(function() {
                response.end('Timeout');
                delete me.outstandingRequests[agentId][message.id];
            },me.httpTimeout)
          }
          callback(senderId, message);
        }
        else {
          // if we're not expecting a response, we first close the connection, then receive the message
          response.end('');
          if (callback !== undefined) {
            callback(senderId, message);
          }
        }
      }
    });
  }
};

/**
 *  Configure a HTTP server listener
 */
HTTPTransport.prototype.initiateServer = function() {
  if (this.server === undefined) {
    var me = this;
    this.server = http.createServer(function (request, response) {
      if (request.method == 'OPTIONS') {
        var headers = {};
        headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
        headers['Access-Control-Allow-Credentials'] = true;
        headers['Access-Control-Max-Age'] = '86400'; // 24 hours
        headers['Access-Control-Allow-Headers'] = 'X-Requested-With, Access-Control-Allow-Origin, X-HTTP-Method-Override, Content-Type, Authorization, Accept';
        // respond to the request
        response.writeHead(200, headers);
        response.end();
      }
      else if (request.method == 'POST') {
        me.processRequest(request, response);
      }
    });

    var me = this;
    this.server.on("error", function(err) {
      if (err.code == "EADDRINUSE") {
        throw new Error("ERROR: Could not start HTTP server. Port " + me.port + " is occupied.");
      }
      else {
        throw new Error(err);
      }
    });

    // Listen on port (default: 3000), IP defaults to 127.0.0.1
    this.server.listen(this.port, function() {
      // Put a friendly message on the terminal
      console.log('Server listening at ', me.url);
    });


  }
  else {
    this.server.close();
    this.server = undefined;
    this.initiateServer();
  }
};


/**
 *  Close the HTTP server
 */
HTTPTransport.prototype.close = function() {
  this.server.close();
  this.server = null;
  // todo reject promises
};


module.exports = HTTPTransport;

