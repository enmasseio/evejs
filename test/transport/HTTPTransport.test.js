var assert = require('assert');
var HTTPTransport = require('../../lib/transport/http/HTTPTransport');
var Promise = require('promise');
var Agent = require('../../lib/Agent');
var RequestModule = require('../../lib/module/RequestModule');
var RPCModule = require('../../lib/module/RPCModule');
Agent.registerModule(RequestModule);
Agent.registerModule(RPCModule);
describe('HTTPTransport', function() {
  var agent1;
  var agent2;
  var agent3;
  var agent4;
  var agent5;
  var agent6;
  var transport;

  before(function () {
    agent1 = new Agent('agent1');
    agent2 = new Agent('agent2');
    agent3 = new Agent('agent3').extend('request');
    agent4 = new Agent('agent4').extend('request');
    agent5 = new Agent('agent5');
    agent6 = new Agent('agent6');

    transport = new HTTPTransport({
      localShortcut: false
    });
    agent1.connect(transport);
    agent2.connect(transport);
    agent3.connect(transport);
    agent4.connect(transport);
    agent5.connect(transport);
    agent6.connect(transport);
    agent2.receive = function (from, message) {
      assert.equal(from, 'http://127.0.0.1:3000/agents/agent1');
      if (message == "reply to me!") {
        this.send(from, "hello back!");
      }
    }

    agent1.receive = function(from, message) {
      assert.equal(message, 'hello back!')
      assert.equal(from, 'http://127.0.0.1:3000/agents/agent2');
    }

    agent4.receive = function (from, message) {
      if (message == 'test') {
        return "hi";
      }
      if (message == 'delay test') {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve("testtest");
          }, 100);
        });
      }
      if (message == 'long delay test') {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            resolve("testtest");
          }, 300);
        });
      }
    };

    agent5.rpcFunctions = {};
    agent6.rpcFunctions = {};
    agent6.rpcFunctions.add = function (params, from) {
      return new Promise(function (resolve, reject) {
        setTimeout(function () {
          resolve(3);
        }, 50);
      });
    };

    agent5.rpc = agent3.loadModule("rpc", agent5.rpcFunctions);
    agent6.rpc = agent4.loadModule("rpc", agent6.rpcFunctions);
  });

  it('should create an HTTPTransport with default settings', function () {
    var transport2 = new HTTPTransport();
    assert.ok(transport2 instanceof HTTPTransport);
    assert.equal(transport2.type, 'http');
    assert.equal(transport2.port, 3000);

    assert.equal(transport2.url, "http://127.0.0.1:3000/agents/:id");
    transport2.close();
  });

  it('should create an HTTPTransport with localShortcut==false', function () {
    var transport2 = new HTTPTransport({
      localShortcut: false
    });
    assert.equal(transport2.localShortcut, false);

    transport2.close();
  });

  it('should receive a message sent over http', function () {
    return agent1.send("http://127.0.0.1:3000/agents/agent2", "hello!").done();
  });

  it('should receive a reply sent over http', function () {
    return agent1.send("http://127.0.0.1:3000/agents/agent2", "reply to me!").done();
  });

  it('should get error that agent is not found', function () {
    return agent1.send("http://127.0.0.1:3000/agents/agent30", "hello")
      .catch(function(err){
        console.log('got error')
        assert.equal(err, 'Error: Agent: "agent30" does not exist.')
      });
  });

  it('should not be able to connect', function () {
    transport.httpTimeout = 1000; // 200 ms to respond;
    return agent1.send("http://8.8.8.8:8000/agents/agent1", "hello")
      .catch(function(err){
        assert.equal(err,'Error: Cannot connect to http://8.8.8.8:8000/agents/agent1');
      });
  });

  it('should send a request and receive a reply in the same connection', function () {
    transport.httpTimeout = 1000; // 1000 ms to deliver;
    transport.httpResponseTimeout = 500; // 500 ms to respond;
    return agent3.request('http://127.0.0.1:3000/agents/agent4', 'test')
      .then(function (reply) {
        assert.equal(reply, 'hi');
      });
  });

  it('should deliver reply on the same line', function () {
    transport.httpTimeout = 1000; // 1000 ms to deliver;
    transport.httpResponseTimeout = 500; // 500 ms to respond;
    return agent3.request('http://127.0.0.1:3000/agents/agent4', 'delay test')
      .then(function (reply) {
        assert.equal(reply, 'testtest');
      });
  });

  it('should deliver reply if the same line is closed', function () {
    transport.httpTimeout = 1000; // 1000 ms to deliver;
    transport.httpResponseTimeout = 200; // 500 ms to respond;
    return agent3.request('http://127.0.0.1:3000/agents/agent4', 'long delay test')
      .then(function (reply) {
        assert.equal(reply, 'testtest');
      });
  });

  // TODO request does not propagate errors in sending
  it.skip('Request - should not be able to deliver this message and catch error', function () {
    transport.httpTimeout = 1000; // 1000 ms to deliver;
    transport.httpResponseTimeout = 200; // 500 ms to respond;
    return agent3.request('http://8.8.8.8:8000/agents/agent4', 'long delay test')
      .catch(function(err){
        console.log('got error');
        assert.equal(err,'Error: Cannot connect to http://8.8.8.8:8000/agents/agent4');
      });
  });

  // TODO request does not propagate errors in sending
  it.skip('Request - should catch an error that the agent took too long', function () {
    transport.httpResponseTimeout = 200; // 200 ms to respond;
    return agent3.request('http://127.0.0.1:3000/agents/agent4', 'long delay test')
      .catch(function(err){
        console.log('got error');
        assert.equal(err, 'Error: Agent took too long to reply.')
      });
  });


  // TODO: is this preferable? Maybe not thow error if its not the same line
  it('RPC - should catch an error that the agent took too long', function () {
    transport.httpResponseTimeout = 200; // 200 ms to respond;
    return agent5.rpc.request('http://127.0.0.1:3000/agents/agent6', {method:'add', params:{a:1,b:2}})
      .catch(function(err){
        console.log("got error")
        assert.equal(err, 'Error: Agent took too long to reply.')
      });
  });

  // TODO: is this preferable?
  it('RPC - should not be able to deliver this message and catch error', function () {
    transport.httpResponseTimeout = 200; // 200 ms to respond;
    return agent5.rpc.request('http://8.8.8.8:8000/agents/agent6', {method:'add', params:{a:1,b:2}})
      .catch(function(err){
        console.log("got error")
        assert.equal(err,'Error: Cannot connect to http://8.8.8.8:8000/agents/agent6');
      });
  });



  // TODO: test HTTPTransport
});
