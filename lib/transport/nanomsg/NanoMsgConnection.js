'use strict';

let NanoMsg = require('nanomsg');
let Promise = require('promise');
let staticCounter = 0;

console.debug = console.log;

/**

 */
function NanoMsgConnection(transport, id, receive) {

    let createUrl = function (doInterface, config, id, counter) {
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
    if (typeof this.socketConfig.tcpnodelay === "undefined") {
        this.socketConfig['tcpnodelay'] = true;
    }
    //TODO: socket config from transport.config, not only predefined

    this.insocket = NanoMsg.socket('pull', this.socketConfig);
    this.sessionIds = [];

    let me = this;
    //Bind to local socket for receiving messages, setup receive method
    this.ready = new Promise(function (resolve, reject) {
        try {
            let url = createUrl(true, transport.config, id, staticCounter);
            me.insocket.bind(url);

            me.insocket.on('data', function (msg) {
                console.debug("NanoMsg received message:", String(msg));
                let wrapper = String(msg).split("|");
                if (wrapper.length === 2) {
                    let sender = wrapper[0];
                    let message = JSON.parse(wrapper[1]);

                    if (me.sessionIds[sender]) {
                        sender = me.sessionIds[sender];
                        console.debug("NanoMsg replaced sessionId by sender:", sender);
                    } else {
                        if (!sender.startsWith("nanomsg")) {
                            console.log("NanoMsg received invalid sender address:", sender, " msg:", message);
                        } else {
                            console.debug("NanoMsg sending new sessionId:", me.sessionIds.length, " for:", sender);
                            me.sessionIds.push(sender);
                            me.send(sender, {"_sessionId": (me.sessionIds.length - 1)});
                        }
                    }
                    if (typeof message._sessionId !== "undefined") {
                        if (me.outSockets[sender]) {
                            me.outSockets[sender].sessionId = message._sessionId;
                            console.debug("NanoMsg received new sessionId:", sender, " id:", message._sessionId);
                        }
                        return;
                    }
                    receive(sender, message);
                } else {
                    console.log("Received invalid NanoMsg message:'" + String(msg) + "'");
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
    console.debug("NanoMsg sending message to:", to, " msg:", message);
    if (!to.startsWith("nanomsg")) {
        console.error("NanoMsg got incorrect recipient ('to') address! to:", to, " msg:", message);
        return Promise.reject();
    }
    try {
        let nanoMsgTo = to.replace(this.transport.type + ":", "");
        if (!this.outSockets[to] || !this.outSockets[to].connected[nanoMsgTo]) {
            console.debug("NanoMsg (re)connect to:", to);
            this.outSockets[to] = NanoMsg.socket('push', this.socketConfig);
            this.outSockets[to].dontwait(true);
            this.outSockets[to].connect(nanoMsgTo);
        }
        if (typeof this.outSockets[to].sessionId === "undefined") {
            console.debug("NanoMsg using senderUrl:", this.getMyUrl());
            this.outSockets[to].send(this.getMyUrl() + "|" + JSON.stringify(message));
        } else {
            console.debug("NanoMsg using sessionId:", this.outSockets[to].sessionId);
            this.outSockets[to].send(this.outSockets[to].sessionId + "|" + JSON.stringify(message));
        }
        return Promise.resolve();
    } catch (e) {
        console.error("NanoMsg failed to send message to:", to, " msg:", message, " err:", e);
        return Promise.reject();
    }

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
        for (let peer in this.outSockets) {
            if (this.outSockets.hasOwnProperty(peer)) {
                this.outSockets[peer].close();
                this.outSockets[peer] = null;
            }
        }
        this.outSockets = {};
    }
};

module.exports = NanoMsgConnection;
