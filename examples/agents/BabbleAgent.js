var babble = require('babble');
var eve = require('../../index');

function BabbleAgent(id, props) {
  // execute super constructor
  eve.Agent.call(this, id);

  this.props = props;

  // babblify the agent
  this.extend('babble');

  // add a conversation listener
  this.listen('hi')
      .listen(function (message, context) {
        console.log(context.from + ': ' + message);
        return message;
      })
      .decide(function (message, context) {
        return (message.indexOf('age') != -1) ? 'age' : 'name';
      }, {
        'name': babble.tell('hi, my name is ' + this.id),
        'age':  babble.tell('hi, my age is ' + this.props.age)
      });

  // connect to all transports provided by the system
  this.connect(eve.system.transports.getAll());
}

// extend the eve.Agent prototype
BabbleAgent.prototype = Object.create(eve.Agent.prototype);
BabbleAgent.prototype.constructor = BabbleAgent;

// have a conversation with an other agent
BabbleAgent.prototype.talk = function (to) {
  var name = this.id;
  var age = this.props.age;

  this.tell(to, 'hi')
      .tell(function (message, context) {
        if (Math.random() > 0.5) {
          return 'my name is ' + name;
        } else {
          return 'my age is ' + age;
        }
      })
      .listen(function (message, context) {
        console.log(context.from + ': ' + message);
      });
};

module.exports = BabbleAgent;
