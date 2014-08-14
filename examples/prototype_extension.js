// This example shows how to extend an Actor
var actors = require('../index');

/**
 * Custom actor prototype
 * @param {String} id
 * @constructor
 * @extend actors.Actor
 */
function MyActor(id) {
  // execute super constructor function
  actors.Actor.call(this, id);

  // listen for greetings
  this.on(/hi|hello/i, this.onGreeting.bind(this));
}

// extend the actors.Actor prototype
MyActor.prototype = Object.create(actors.Actor.prototype);
MyActor.prototype.constructor = MyActor;

/**
 * Send a greeting to an actor
 * @param {String} to
 */
MyActor.prototype.sayHi = function (to) {
  this.send(to, 'Hi!');
};

/**
 * Handle incoming greetings
 * @param {String} from
 * @param {String} message
 */
MyActor.prototype.onGreeting = function (from, message) {
  console.log(from + ' said: ' + message);
};

var transport = new actors.LocalTransport();
var actor1 = new MyActor('actor1');
var actor2 = new MyActor('actor2');

// connect both actors to the transport
actor1.connect(transport);
actor2.connect(transport);

// send a message to actor 1
actor2.sayHi('actor1');

// Test prototype inheritance:
// console.log(actor1 instanceof MyActor);       // true
// console.log(actor1 instanceof actors.Actor);  // true
// console.log(actor1.constructor.name);         // 'MyActor'
