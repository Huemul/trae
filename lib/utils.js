const mergeRecursive = require('merge').recursive;

function merge(...params)  {
  return mergeRecursive(true, ...params);
}

module.exports = {
  merge
};
