var assert = require('assert');
var Promise = require('promise');
var util = require('../lib/util');

describe('util', function() {

  it('should check whether an object is a Promise using ducktyping', function () {
    assert.equal(util.isPromise({}), false);
    assert.equal(util.isPromise('promise'), false);
    var obj = {
      'then': 'foo',
      'catch': 'bar'
    };
    assert.equal(util.isPromise(obj), false);

    assert.equal(util.isPromise(new Promise(function() {})), true);
    assert.equal(util.isPromise(Promise.resolve()), true);
    assert.equal(util.isPromise(Promise.reject()), true);

    var myPromise = {
      'then': function() {},
      'catch': function() {}
    };
    assert.equal(util.isPromise(myPromise), true);
  });

  it('should parse an url', function () {
    assert.deepEqual(util.parseUrl('http://example.com/path'),      {protocol: 'http', domain: 'example.com', path: 'path'});
    assert.deepEqual(util.parseUrl('http://example.com/some/path'), {protocol: 'http', domain: 'example.com', path: 'some/path'});
    assert.deepEqual(util.parseUrl('https://example.com/'),         {protocol: 'https', domain: 'example.com', path: ''});
    assert.deepEqual(util.parseUrl('a://b/c'),                      {protocol: 'a', domain: 'b', path: 'c'});
  });

  it ('should check whether a string is a UUID', function () {
    assert.equal(util.isUUID('5348bf37-c86e-4fb2-9ed7-67e829031490'), true);
    assert.equal(util.isUUID('5348bf37-c86e-4fb2-9ed7-67e8290314'), false)
    assert.equal(util.isUUID('foo'), false)
  })
});
