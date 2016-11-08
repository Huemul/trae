const mergeRecursive = require('merge').recursive;

/**
 * Recursively merge objects
 *
 * @param {Object} objects to merge
 * @return {Object} the merged objects
 */
function merge(...params)  {
  return mergeRecursive(true, ...params);
}

/**
 * Returns an object with the skipped properties
 *
 * @param {Object} obj the object to skip properties from
 * @param {[String]} keys keys of the properties to skip
 * @return {Object} the object with the properties skipped
 */
function skip(obj, keys) {
  const skipped = {};
  Object.keys(obj).forEach((objKey) => {
    if (keys.indexOf(objKey) === -1) {
      skipped[objKey] = obj[objKey];
    }
  });
  return skipped;
}

module.exports = {
  merge,
  skip
};
