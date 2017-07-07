/**
 * Created by luis on 30-6-17.
 */
/**
 * Custom agent prototype
 * @param {String} id
 * @constructor
 * @extend eve.Agent
 */
function HandGameAgent(id) {
  // execute super constructor
  eve.Agent.call(this, id);

  // extend the agent with RPC functionality
  this.rpc = this.loadModule('rpc', this.rpcFunctions, {timeout:2000}); // option 1

  // connect to all transports configured by the system
  this.connect(eve.system.transports.getAll());

}


// extend the eve.Agent prototype
HandGameAgent.prototype = Object.create(eve.Agent.prototype);
HandGameAgent.prototype.constructor = HandGameAgent;

/**
 * Just to show that no message is comming to this method
 */
HandGameAgent.prototype.receive = function(from, message) {

  // We will not receive anything here due the communication through rpc messages
  console.log("Received from: " + from + " said: " + message);

};

// Creates rpcFunctions object and its methods to be reachable from outside through rpc messages
HandGameAgent.prototype.rpcFunctions = {};

// This method is called from player2 on the scheduler
HandGameAgent.prototype.rpcFunctions.getHand = function(){

  // Get a random number between 1 and 3
  var n = Math.floor(Math.random() * 3) + 1;

  // Define and return hand
  if(n == 1) {
    return hand = "rock";
  } else if(n == 2) {
    return hand = "scissors";
  } else {
    return hand = "paper";
  }

}

// This method is called just from player1 (Not visible from player2)
HandGameAgent.prototype.compareHands = function(handP1,handP2){

  // Make sure both hands have correct values
  if( (handP1 !== "rock" && handP1 !== "scissors" && handP1 !== "paper") ||
    (handP2 !== "rock" && handP2 !== "scissors" && handP2 !== "paper")){
    return " -- UNKNOWN HAND --";
  }

  // Check winner
  if(handP1 === handP2){
    return 0; // draw
  } else if( ((handP1 === "rock") && (handP2 === "scissors"))  ||
             ((handP1 === "scissors") && (handP2 === "paper")) ||
             ((handP1 === "paper") && (handP2 === "rock")) ){
    return 1; // player 1 won
  } else {
    return 2; // player 2 won
  }

}