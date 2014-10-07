var eve = require('../../index');
var Promise = require('promise');

agent1 = new eve.Agent('agent1');
agent2 = new eve.Agent('agent2');

var transport = new eve.transport.LocalTransport();
agent1.connect(transport);
agent2.connect(transport);

agent1.rpcFunctions = {};
agent2.rpcFunctions = {};
agent1.rpcFunctions.addPromiseErr = function (params, from) {
  return new Promise(function (resolve,reject) {
    reject("Cannot compute something that easy!");
  });
};
agent1.rpcFunctions.throwError = function (params, from) {
  throw new Error("help")
};
agent1.rpcFunctions.shouldGiveError = function (params, from) {
  var a = abc + def; // UNDEFINED VARIABLES!
  return a;
};
agent1.extend("rpc", agent1.rpcFunctions);
agent2.extend("rpc", agent2.rpcFunctions);


agent2.request("agent1",{method:"addPromiseErr",params:{a:1,b:3}})
  .catch(function (err) {
   console.log(1,err); // ok
  })

agent2.request("agent1",{method:"throwError",params:{a:1,b:3}})
  .catch(function (err) {
    console.log(2,err); // ok
  })


agent2.request("agent1",{method:"shouldGiveError",params:{a:1,b:3}})
  .catch(function (err) {
    console.log(3,err); // ok
  })


// THESE NEED TO CRASH! CODING IS VERY HARD IF THESE ALL SILENTLY CONTINUE!
// WE NEED TRACEBACKS AND EVERYTHING!
agent2.request("agent1",{method:"addPromiseErr",params:{a:1,b:3}});
agent2.request("agent1",{method:"throwError",params:{a:1,b:3}});
agent2.request("agent1",{method:"shouldGiveError",params:{a:1,b:3}});
function foo() {
  return agent2.request("agent1", {method: "shouldGiveError", params: {a: 1, b: 3}});
}
foo();


function bar() {
  var b = new Promise(function (resolve, reject) {
    throw new Error("kill me now.")
  })
  return b;
}

// BREAK SOMETHING!
bar().then(function(rep) {console.log(rep);}).catch(function(err) {throw new Error(err)})
bar();

// we need to update to promises library vs 6.0.0, it has done over then which rethrows errors.
