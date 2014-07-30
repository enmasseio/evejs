var assert = require('assert');
var Actor = require('../lib/Actor');
var LocalMessageBus = require('../lib/LocalMessageBus');

describe('Actor', function() {

  describe ('creation', function () {

    it('should create an Actor without id', function () {
      var actor = new Actor();
      assert.ok(actor instanceof Actor);
      assert.ok(actor.id && actor.id.length);
    });

    it('should create an Actor with id', function () {
      var actor = new Actor('actor1');
      assert.ok(actor instanceof Actor);
      assert.equal(actor.id, 'actor1');
    });
  });

  describe ('message listeners', function () {

    it('should add and remove a message listener', function () {
      var actor = new Actor('actor1');
      var sender = 'actor2';
      var count = 0;

      var pattern = 'hello';
      var listener = function (from, message, data) {
        assert.equal(from, sender);
        count++;
      };

      // add the listener, test if listener is triggered
      actor.on(pattern, listener);
      actor.onMessage(sender, pattern);
      assert.equal(count, 1);

      // remove the listener, test if listener is not triggered anymore
      actor.off(pattern, listener);
      actor.onMessage(sender, pattern);
      assert.equal(count, 1);
    });

    it('should listen to messages using a string pattern', function (done) {
      var actor = new Actor('actor1');

      actor.on('hello', function (from, message, data) {
        assert.equal(from, 'actor2');
        assert.equal(message, 'hello');
        assert.deepEqual(data, {name: 'actor2'});
        done();
      });

      actor.onMessage('actor2', 'hello', {name: 'actor2'});
    });

    it('should listen to messages using a regexp pattern', function (done) {
      var actor = new Actor('actor1');

      actor.on(/hello/, function (from, message, data) {
        assert.equal(from, 'actor2');
        assert.equal(message, 'hello, my name is actor2');
        assert.strictEqual(data, undefined);
        done();
      });

      actor.onMessage('actor2', 'hi there'); // this message should be ignored
      actor.onMessage('actor2', 'hello, my name is actor2');
    });

    it('should listen to messages using a function pattern', function (done) {
      var actor = new Actor('actor1');

      actor.on(function (message) {
        return message.indexOf('hello') != -1;
      }, function (from, message, data) {
        assert.equal(from, 'actor2');
        assert.equal(message, 'hello, my name is actor2');
        assert.strictEqual(data, undefined);
        done();
      });

      actor.onMessage('actor2', 'hi there'); // this message should be ignored
      actor.onMessage('actor2', 'hello, my name is actor2');
    });

  });

  describe ('messagebus', function () {
    it('should send a message via a messagebus', function (done) {
      var bus = new LocalMessageBus();

      var actor1 = new Actor('actor1');
      actor1.connect(bus);
      var actor2 = new Actor('actor2');
      actor2.connect(bus);

      actor1.on('hello', function (from, message) {
        assert.equal(from, 'actor2');
        assert.equal(message, 'hello');
        done();
      });

      actor2.send('actor1', 'hello');
    });

    it('should resolve a promise when connected to a message bus', function () {
      var bus = new LocalMessageBus();
      var actor1 = new Actor('actor1');

      return actor1.connect(bus).then(function (actor) {
        assert.strictEqual(actor, actor1);
      });
    });

    it('should connect to multiple messagebusses', function (done) {
      var bus1 = new LocalMessageBus();
      var bus2 = new LocalMessageBus();

      var actor1 = new Actor('actor1');
      var actor2 = new Actor('actor2');
      var actor3 = new Actor('actor3');

      actor1.connect(bus1);
      actor2.connect(bus1);

      actor2.connect(bus2);
      actor3.connect(bus2);

      var count = 0;

      function log(from, message) {
        assert.equal(from, 'actor2');
        assert.equal(message, 'hello');

        count++;
        if (count == 2) {
          done();
        }
      }

      actor1.on('hello', log);
      actor3.on('hello', log);

      // send messages to actors connected via a different message bus
      actor2.send('actor1', 'hello');
      actor2.send('actor3', 'hello');
    });
  });

});
