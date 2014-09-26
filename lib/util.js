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
 * Splits an url like "protocol://domain/path"
 * @param {string} url
 * @return {{protocol: string, domain: string, path: string} | null}
 *            Returns an object with properties protocol, domain, and path
 *            when there is a match. Returns null if no valid url.
 *
 */
exports.parseUrl = function (url) {
  // match an url like "protocol://domain/path"
  var match = /^([A-z]+):\/\/([^\/]+)(\/(.*)$|$)/.exec(url);
  if (match) {
    return {
      protocol: match[1],
      domain: match[2],
      path: match[4]
    }
  }

  return null;
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
