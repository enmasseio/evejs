'use strict';

/**
 * Test whether the provided value is a Promise.
 * A value is marked as a Promise when it is an object containing functions
 * `then` and `catch`.
 * @param {*} value
 * @return {boolean} Returns true when `value` is a Promise
 */
exports.isPromise = function (value) {
  return value &&
      typeof value['then'] === 'function' &&
      typeof value['catch'] === 'function'
};

/**
 * Normalize a url. Removes trailing slash
 * @param {string} url
 * @return {string} Returns the normalized url
 */
exports.normalizeURL = function (url) {
  if (url[url.length - 1] == '/') {
    return url.substring(0, url.length - 1);
  }
  else {
    return url;
  }
};
