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

  this.url = config.url;
  this.remoteUrl = config.remoteUrl;
  this.localShortcut = config.localShortcut || true;

  this.httpTimeout = 1000; // 1 second
  this.regexHosts = /[http]{4}s?:\/\/([a-z\-\.A-Z0-9]*):?([0-9]*)(\/[a-z\/:A-Z0-9._\-% \\\(\)\*\+\.\^\$]*)/;
  this.urlHostData = this.regexHosts.exec(this.url);

  this.regexPath = this.getRegEx(this.urlHostData[3]);
  this.port = config.port || this.urlHostData[2] || 3000;
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
  if (this.server === undefined) {
    this.initiateServer();
  }
  this.outstandingRequests[id] = {};
  return new HTTPConnection(this, id, receive);
};

/**
 * Send a message to a agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
HTTPTransport.prototype.send = function(from, to, message) {
  var me = this;
  return new Promise(function (resolve,reject) {
    var hostData = me.regexHosts.exec(to);
    var fromRegexpCheck = me.regexPath.exec(from);
    var fromAgentId = fromRegexpCheck[1];

    // check for local shortcut possibility
    if (me.localShortcut == true) {
      var toRegexpCheck = me.regexPath.exec(to);
      var toAgentId = toRegexpCheck[1];
      var toPath = hostData[3].replace(toAgentId,"");

      // check if the "to" address is on the same URL, port and path as the "from"
      if ((hostData[1] == '127.0.0.1'       && hostData[2] == me.urlHostData[2] && toPath == me.path) ||
          (me.urlHostData[1] == hostData[1] && hostData[2] == me.urlHostData[2] && toPath == me.path)) {
        // by definition true but check anyway
        if (me.agents[toAgentId] !== undefined) {
          me.agents[toAgentId](fromAgentId, message);
          resolve();
          return;
        }
      }
    }

    // stringify the message. If the message is an object, it can have an ID so it may be part of a req/rep.
    if (typeof message == 'object') {
      message = JSON.stringify(message);

      // check if the send is a reply to an outstanding request and if so, deliver
      var outstanding = me.outstandingRequests[fromAgentId];
      if (outstanding[message.id] !== undefined) {
        var callback = outstanding[message.id];
        clearTimeout(callback.timeout);
        callback.response.end(JSON.stringify(message));
        delete outstanding[message.id];
        resolve();
        return;
      }
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
        var parsedResponse;
        try {parsedResponse = JSON.parse(response);} catch (err) {parsedResponse = response;}
        if (typeof parsedResponse == 'object') {
          if (parsedResponse.__httpError__ !== undefined) {
            reject(new Error(parsedResponse.__httpError__));
            return;
          }
        }
        me.agents[fromAgentId](to, parsedResponse);
        resolve();
      });
    });

    request.on('error', function(e) {
      console.log('Problem with sending Message to ' + to + ': ' + e.message);
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
        var error = new Error('Agent: "' + agentId + '" does not exist.');
        response.end(JSON.stringify({__httpError__:error.message || error.toString()}));
      }
      else {
        if (expectReply == true) {
          me.outstandingRequests[agentId][message.id] = {
            response: response,
            timeout: setTimeout(function () {
              response.end('Timeout');
              delete me.outstandingRequests[agentId][message.id];
            }, me.httpTimeout)
          };
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
    this.server.on('error', function(err) {
      if (err.code == 'EADDRINUSE') {
        throw new Error('ERROR: Could not start HTTP server. Port ' + me.port + ' is occupied.');
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

