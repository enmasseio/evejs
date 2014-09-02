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

  it('should split an url', function () {
    assert.deepEqual(util.splitUrl('http://example.com/path'),      {protocol: 'http', domain: 'example.com', path: 'path'});
    assert.deepEqual(util.splitUrl('http://example.com/some/path'), {protocol: 'http', domain: 'example.com', path: 'some/path'});
    assert.deepEqual(util.splitUrl('https://example.com/'),         {protocol: 'https', domain: 'example.com', path: ''});
    assert.deepEqual(util.splitUrl('a://b/c'),                      {protocol: 'a', domain: 'b', path: 'c'});
  });
});
