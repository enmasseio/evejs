/**
 * Created by Alex on 8/28/14.
 */

var http = require('http');
var Promise = require('promise');
var Transport = require('./../Transport');
var HTTPConnection = require('./HTTPConnection');

/**
 * HTTP Transport layer:
 *
 * Supported Options:
 *
 * {Number}  options.port | Port to listen on.
 * {String}  options.path | Path, with or without leading and trailing slash (/)
 * {Boolean} options.localIfAvailable | if the agentId exists locally, use local transport. (local)
 *
 * Address: http://127.0.0.1:PORTNUMBER/PATH
 */


function HTTPTransport(config) {
  this.id = config.id || null;
  this.networkId = null;

  this.agents = {};

  this.port = config.port || 3000;
  this.url = config.url;
  this.remoteUrl = config.remoteUrl;
  this.localShortcut = config.localShortcut || false;

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
  return new HTTPConnection(this, id, receive);
};

/**
 * Send a message to a agent
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
HTTPTransport.prototype.send = function(from, to, message, receive) {
  var hostData = this.regexHosts.exec(to);

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
      receive(to, response);
    });
  });

  request.on('error', function(e) {
    console.log('Problem with sendMessage to ' + to + ': ' + e.message);
  });

  // write data to request body
  request.write(message);
  request.end();
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
      var message = JSON.parse(body);

      // check if JSON RPC
      expectReply = message.jsonrpc && message.jsonrpc == '2.0' || expectReply;
      // check if type == 'request'
      expectReply = message.type && message.type == 'request' || expectReply;

      response.writeHead(200, headers);
      // construct callback

      var callback = me.agents[agentId];
      if (expectReply == true) {
        if (!callback) {
          response.end(JSON.stringify({result: 'Agent not found', error: 404}));
        }
        // invoke as callback(from, message)
        var reply = callback(senderId, message);
        response.end(reply);

      }
      else {
        // if we're not expecting a response, we first close the connection, then receive the message
        response.end('');
        callback(senderId, message);
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

    this.server.on("error", function(err) {
      if (err.code == "EADDRINUSE") {
        console.log("ERROR: Could not start HTTP server. Port", this.port, "is occupied.");
      }
    }.bind(this));

    // Listen on port (default: 3000), IP defaults to 127.0.0.1
    this.server.listen(this.port, function() {
      // Put a friendly message on the terminal
      console.log('Server listening at ', this.url);
    }.bind(this));


  }
  else {
    this.server.close();
    this.server = undefined;
    this.initiateServer();
  }
};

module.exports = HTTPTransport;

