var assert = require('assert');
var HTTPTransport = require('../../lib/transport/http/HTTPTransport');
var WebSocketTransport = require('../../lib/transport/websocket/WebSocketTransport');
var Promise = require('promise');
var Agent = require('../../lib/Agent');
describe('HTTPTransport', function() {
  var agent1;
  var agent2;
  var wsTransport;
  var httpTransport;

  it('Should be able to use websockets and HTTP on the same port', function () {
    agent1 = new Agent('agent1');
    agent2 = new Agent('agent2');

    wsTransport = new WebSocketTransport({
      type: 'ws',
      url: 'ws://127.0.0.1:' + 3000 + '/agents/:id',
      localShortcut: false
    });
    httpTransport = new HTTPTransport({
        type: 'http',
        url: 'http://127.0.0.1:' + 3000 + '/agents/:id',
        localShortcut: false
    });


    agent1.connect(httpTransport);
    agent1.connect(wsTransport);
    agent2.connect(httpTransport);
    agent2.connect(wsTransport);

    agent2.receive = function (from, message) {
      console.log(from, message);
      if (message == 'reply to me!') {
        this.send(from, 'hello back!');
      }
    }

    agent1.receive = function(from, message) {
      assert.equal(message, 'hello back!');
      assert.equal(from, 'http://127.0.0.1:3000/agents/agent2');
    }

    return Promise.all([wsTransport.ready, httpTransport.ready]).then(function(a) {console.log(a)}).done();
  });

  it('Should be able to use websockets and HTTP on the same port', function () {
    //agent1.send('http://127.0.0.1:3000/agents/agent2','reply to me!').done();
    //agent1.send('ws://127.0.0.1:3000/agents/agent2','reply to me!').done();
  });
});
