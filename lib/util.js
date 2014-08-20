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
