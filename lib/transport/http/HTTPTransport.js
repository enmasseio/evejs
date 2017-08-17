'use strict';

const http = require('http');
const Promise = require('promise');
const Transport = require('./../Transport');
const HTTPConnection = require('./HTTPConnection');
const uuid = require('uuid-v4');
const URL = require('url');
const fs = require('fs');
const path = require('path');

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

  this.url = config && config.url || "http://127.0.0.1:3000/agents/:id";
  this.parsedUrl = this.extendUrl(URL.parse(this.url));

  this.remoteUrl = config && config.remoteUrl;
  this.localShortcut = (config && config.localShortcut === false) ? false : true;

  this.httpTimeout = config && config.httpTimeout || 2000; // 1 second - timeout to send message
  this.httpResponseTimeout = config && config.httpResponseTimeout || 200;  // 0.5 second - timeout to expect reply after delivering request


  this.port = config && config.port || this.parsedUrl.port || 3000;
  this.path = this.parsedUrl.pathname.replace(':id', '');

  if (typeof window !== 'undefined') {
    this.send = this.webSend;
  }
}

HTTPTransport.prototype = new Transport();
HTTPTransport.prototype.type = 'http';


HTTPTransport.prototype.extendUrl = function (parsedUrl) {
  var path = parsedUrl.path;
  var idx = path.lastIndexOf(":id");
  if (idx >= 0) {
    parsedUrl.pre = path.slice(0, idx);
    parsedUrl.post = path.slice(idx + 3);
  }
  return parsedUrl;
};
HTTPTransport.prototype.getAgentId = function (parsedUrl, requestUrl) {
  if (typeof requestUrl.path == "string"){
    requestUrl = requestUrl.path;
  }
  var res = requestUrl.replace(parsedUrl.pre, "");
  if (parsedUrl.post != "") {
    res = res.replace(parsedUrl.post, "");
  }
  if (res.indexOf("/") > 0) {
    res = res.slice(0, res.indexOf("/"));
  }
  return res;
};
HTTPTransport.prototype.dropAgentPath = function (parsedUrl, requestUrl) {
  return requestUrl.replace(parsedUrl.pre + this.getAgentId(parsedUrl, requestUrl) + parsedUrl.post, "");
};


/**
 * Connect an agent
 * @param {String} id
 * @param {Function} receive  Invoked as receive(from, message)
 * @return {HTTPConnection}   Returns a connection.
 */
HTTPTransport.prototype.connect = function (id, receive) {
  if (this.server === undefined && typeof window === 'undefined') {
    this.initiateServer();
  }
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
HTTPTransport.prototype.send = function (from, to, message) {
  var me = this;
  return new Promise(function (resolve, reject) {
    const remote = URL.parse(to);
    const myaddr = URL.parse(from);

    const fromAgentId = me.getAgentId(me.parsedUrl,myaddr);
    var outstandingMessageID = uuid();

    // check for local shortcut possibility
    if (me.localShortcut == true) {
      var toAgentId = me.getAgentId(me.parsedUrl,remote);
      var toPath = remote.pathname.replace(toAgentId, "");

      // check if the "to" address is on the same URL, port and path as the "from"
      if (remote.hostname == myaddr.hostname && remote.port == myaddr.port && toPath == me.path) {
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
      // check if the send is a reply to an outstanding request and if so, deliver
      var outstanding = me.outstandingRequests[fromAgentId];
      if (outstanding[message.id] !== undefined) {
        var callback = outstanding[message.id];
        callback.response.end(JSON.stringify(message));
        clearTimeout(callback.timeout);
        delete outstanding[message.id];
        resolve();
        return;
      }
      // stringify the message.
      message = JSON.stringify(message)
    }

    // all post options
    var options = {
      host: remote.hostname,
      port: remote.port,
      path: remote.path,
      method: 'POST',
      headers: {
        'x-eve-senderurl': from, // used to get senderID
        'Content-type': 'text/plain'
      }
    };
    var request = http.request(options, function (res) {
      res.setEncoding('utf8');
      // message was delivered, clear the cannot deliver timeout.
      clearTimeout(me.outstandingMessages[fromAgentId][outstandingMessageID].timeout);
      // listen to incoming data
      res.on('data', function (response) {
        var parsedResponse;
        try {
          parsedResponse = JSON.parse(response);
        } catch (err) {
          parsedResponse = response;
        }
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

    me.outstandingMessages[fromAgentId][outstandingMessageID] = {
      timeout: setTimeout(function () {
        request.abort();
        reject(new Error("Cannot connect to " + to))
      }, me.httpTimeout),
      reject: reject
    };

    request.on('error', function (e) {
      reject(e);
    });

    // write data to request body
    request.write(message);
    request.end();
  });
};


/**
 * Send a request to an url. Only for web.
 * @param {String} from    Id of sender
 * @param {String} to      Id of addressed peer
 * @param {String} message
 */
HTTPTransport.prototype.webSend = function (from, to, message) {
  var me = this;
  return new Promise(function (resolve, reject) {
    if (typeof message == 'object') {
      message = JSON.stringify(message);
    }
    const fromAgentId = me.getAgentId(me.parsedUrl,URL.parse(from));

    // create XMLHttpRequest object to send the POST request
    var http = new XMLHttpRequest();

    // insert the callback function. This is called when the message has been delivered and a response has been received
    http.onreadystatechange = function () {
      if (http.readyState == 4 && http.status == 200) {
        var response = "";
        if (http.responseText.length > 0) {
          response = JSON.parse(http.responseText);
        }
        me.agents[fromAgentId](to, response);
        // launch callback function
        resolve();
      }
      else if (http.readyState == 4) {
        reject(new Error("http.status:" + http.status));
      }
    };

    // open an asynchronous POST connection
    http.open("POST", to, true);
    // include header so the receiving code knows its a JSON object
    http.setRequestHeader("Content-Type", "text/plain");
    // send
    http.send(message);
  });
};


/**
 * This is the HTTP equivalent of receiveMessage.
 *
 * @param request
 * @param response
 */
HTTPTransport.prototype.processRequest = function (request, response) {
  var me = this;
  var url = request.url;

  // define headers
  var headers = {};
  headers['Access-Control-Allow-Origin'] = '*';
  headers['Access-Control-Allow-Credentials'] = true;
  headers['Content-Type'] = 'text/plain';

  const agentId = me.getAgentId(me.parsedUrl,URL.parse(url));
  var senderId = 'unknown';
  if (request.headers['x-eve-senderurl'] !== undefined) {
    senderId = request.headers['x-eve-senderurl'];
  }
  var body = '';
  request.on('data', function (data) {
    body += data;
    if (body.length > 30e6) {        // 30e6 == 30MB
      request.connection.destroy(); // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
    }
  });

  request.on('end', function () {
    var expectReply = false;
    var message;
    try {
      message = JSON.parse(body);
    } catch (err) {
      message = body;
    }

    // check if JSON RPC
    expectReply = message.jsonrpc && message.jsonrpc == '2.0' || expectReply;
    // check if type == 'request'
    expectReply = message.type && message.type == 'request' || expectReply;

    response.writeHead(200, headers);
    // construct callback
    var callback = me.agents[agentId];
    if (callback === undefined) {
      var error = new Error('Agent: "' + agentId + '" does not exist.');
      response.end(JSON.stringify({__httpError__: error.message || error.toString()}));
    }
    else {
      if (expectReply == true) {
        me.outstandingRequests[agentId][message.id] = {
          response: response,
          timeout: setTimeout(function () {
            response.end("timeout");
            delete me.outstandingRequests[agentId][message.id];
          }, me.httpResponseTimeout)
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

};

/**
 *  Configure a HTTP server listener
 */
HTTPTransport.prototype.initiateServer = function () {
  if (this.server === undefined) {
    var me = this;
    const path2resources = fs.existsSync("./node_modules/evejs/resources") ? "./node_modules/evejs/resources/" : "./resources";
    this.server = http.createServer(function (request, response) {
      if (request.method == 'POST') {
        me.processRequest(request, response);
      } else if (request.method == 'GET') {
        //Check agent existence:
        var agentId = me.getAgentId(me.parsedUrl,request.url);
        var callback = me.agents[agentId];
        if (callback === undefined) {
          var error = new Error('Agent: "' + agentId + '" does not exist.');
          response.end(JSON.stringify({__httpError__: error.message || error.toString()}));
          return;
        }
        // extract URL path

        var pathname = path2resources + me.dropAgentPath(me.parsedUrl, request.url);
        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        var filename = pathname.slice(pathname.lastIndexOf("/") + 1);
        var ext = null;
        if (filename == "") {
          response.statusCode = 301;
          response.setHeader("Location", request.url + "/index.html");
          response.end("Redirecting to agent UI.");
          return;

        }
        if (filename != "" && filename.lastIndexOf(".") >= 0) {
          ext = filename.slice(filename.lastIndexOf("."));
        }
        if (ext == null || ext == "") {
          ext = ".html";
        }
        //console.log(request.url,pathname,filename, ext);
        // maps file extention to MIME typere
        const map = {
          '.ico': 'image/x-icon',
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.json': 'application/json',
          '.css': 'text/css',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.wav': 'audio/wav',
          '.mp3': 'audio/mpeg',
          '.svg': 'image/svg+xml',
          '.pdf': 'application/pdf',
          '.doc': 'application/msword'
        };

        fs.exists(pathname, function (exist) {
          if (!exist) {
            // if the file is not found, return 404
            response.statusCode = 404;
            response.end('File ' + pathname + ' not found!');
            return;
          }

          // if is a directory search for index file matching the extention
          if (fs.statSync(pathname).isDirectory()) pathname += '/index' + ext;

          // read file from file system
          fs.readFile(pathname, function (err, data) {
            if (err) {
              response.statusCode = 500;
              response.end("Error getting the file: " + err + '.');
            } else {
              // if the file is found, set Content-type and send data
              response.setHeader('Content-type', map[ext] || 'text/plain');
              response.end(data);
            }
          });
        });


      } else if (request.method == 'OPTIONS') {
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
    });

    this.server.on('error', function (err) {
      if (err.code == 'EADDRINUSE') {
        throw new Error('ERROR: Could not start HTTP server. Port ' + me.port + ' is occupied.');
      }
      else {
        throw new Error(err);
      }
    });

    // Listen on port (default: 3000), IP defaults to 127.0.0.1
    this.server.listen(this.port, function () {
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
HTTPTransport.prototype.close = function () {
  // close all open connections
  for (var agentId in this.outstandingRequests) {
    if (this.outstandingRequests.hasOwnProperty(agentId)) {
      var agentRequests = this.outstandingRequests[agentId];
      for (var messageId in agentRequests) {
        if (agentRequests.hasOwnProperty(messageId)) {
          var openMessage = agentRequests[messageId];
          var error = new Error('Server shutting down.');
          openMessage.response.end(JSON.stringify({__httpError__: error.message || error.toString()}));
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

