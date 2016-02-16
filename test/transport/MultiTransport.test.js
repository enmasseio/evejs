var assert = require('assert');
var HTTPTransport = require('../../lib/transport/http/HTTPTransport');
var WebSocketTransport = require('../../lib/transport/websocket/WebSocketTransport');
var Promise = require('promise');
var Agent = require('../../lib/Agent');

describe('MultiTransport on the same port', function() {
  var agent1;
  var agent2;
  var wsTransport;
  var httpTransport;

  before (function () {
    agent1 = new Agent('agent1');
    agent2 = new Agent('agent2');

    httpTransport = new HTTPTransport({
      type: 'http',
      url: 'http://127.0.0.1:' + 3000 + '/agents/:id',
      localShortcut: false
    });

    agent1.connect(httpTransport);
    return agent1.ready
        .then(function () {
          wsTransport = new WebSocketTransport({
            type: 'ws',
            url: 'ws://127.0.0.1:' + 3000 + '/agents/:id',
            localShortcut: false,
            httpTransport:httpTransport
          });
          agent1.connect(wsTransport);
          return agent1.ready;
        }).then(function() {
          agent2.connect(httpTransport);
          agent2.connect(wsTransport);
        })
  });

  after(function() {
    httpTransport.close();
    wsTransport.close();
  });

  it('Should be able to use websockets and HTTP on the same port', function () {
    return new Promise( function(resolve, reject) {
      var counter = 0;

      agent2.receive = function (from, message) {
        assert.equal(message, 'reply to me!');
        counter++;
        //console.log("received from:", from, counter);
        if (counter == 2) {
          resolve();
        }
      };

      agent1.send('http://127.0.0.1:3000/agents/agent2', 'reply to me!');
      agent1.send('ws://127.0.0.1:3000/agents/agent2', 'reply to me!');
    });
  });
});
