'use strict';

var NanoMsg = require('nanomsg');
var Promise = require('promise');
var staticCounter = 0;

/**

 */
function NanoMsgConnection(transport, id, receive) {

    var createUrl = function (doInterface, config, id, counter) {
        if (!config) {
            return "inproc://" + id;
        }
        if (doInterface) {
            if (config.port) {
                return "tcp://" + config.interface + ":" + config.port;
            } else if (config.baseport) {
                return "tcp://" + config.interface + ":" + (config.baseport + counter);
            }
        } else {
            if (config.port && config.host) {
                return "tcp://" + config.host + ":" + config.port;
            } else if (config.baseport && config.host) {
                return "tcp://" + config.host + ":" + (config.baseport + counter);
            }
        }
        if (config.url) {
            return config.url.replace("nanomsg:", "").replace(":id", id);
        }
        return "inproc://" + id;
    };

    this.transport = transport;
    this.id = id;
    this.url = createUrl(false, transport.config, id, staticCounter);
    this.socketConfig = transport.config.socketConfig || {'ipv6': false, 'tcpnodelay': true};
    if (typeof this.socketConfig.tcpnodelay == "undefined") {
        this.socketConfig['tcpnodelay'] = true;
    }
    //TODO: socket config from transport.config, not only predefined

    this.insocket = NanoMsg.socket('pull', this.socketConfig);
    this.sessionIds = [];

    var me = this;
    //Bind to local socket for receiving messages, setup receive method
    this.ready = new Promise(function (resolve, reject) {
        try {
            var url = createUrl(true, transport.config, id, staticCounter);
            me.insocket.bind(url);

            me.insocket.on('data', function (msg) {
                var wrapper = String(msg).split("|");
                if (wrapper.length == 2){
                    var sender = wrapper[0];
                    var message = JSON.parse(wrapper[1]);

                    if (message._sessionId && me.outSockets[sender]){
                        me.outSockets[sender].sessionId = message._sessionId;
                        return;
                    }
                    if (me.sessionIds[sender]){
                        sender = me.sessionIds[sender];
                    } else{
                        me.sessionIds.push(sender);
                        me.send(sender,{"_sessionId":(me.sessionIds.length-1)});
                    }
                    receive(sender, message);
                } else {
                    console.log("Received invalid NanoMsg message:'"+String(msg)+"'");
                }
            });
        } catch (e) {
            console.log("NanoMsg failed to initialize", e);
            reject(e);
            return;
        }
        resolve();
    });

    staticCounter++;
    //Keep list of peer connections, trying to reuse them when possible.
    this.outSockets = {};
}

NanoMsgConnection.prototype.getMyUrl = function () {
    return this.transport.type + ":" + this.url;
};

/**
 * Send a message to an agent.
 * @param {string} to
 * @param {*} message
 * @return {Promise} returns a promise which resolves when the message has been sent
 */
NanoMsgConnection.prototype.send = function (to, message) {
    if (!this.outSockets[to]) {
        this.outSockets[to] = NanoMsg.socket('push', this.socketConfig);
        this.outSockets[to].dontwait(true);
        this.outSockets[to].connect(to.replace(this.transport.type + ":", ""))
    }
    if (!this.outSockets[to].sessionId) {
        this.outSockets[to].send(this.getMyUrl() + "|" + JSON.stringify(message));
    } else {
        this.outSockets[to].send(this.outSockets[to].sessionId + "|" + JSON.stringify(message));
    }
    return Promise.resolve();
};

/**
 * Close the connection
 */
NanoMsgConnection.prototype.close = function () {

    //Remove local socket
    if (this.insocket) {
        this.insocket.close();
    }
    //Close all remaining peer connections
    if (this.outSockets) {
        for (var peer in this.outSockets) {
            if (this.outSockets.hasOwnProperty(peer)) {
                this.outSockets[peer].close();
            }
        }
        this.outSockets = {};
    }
};

module.exports = NanoMsgConnection;
