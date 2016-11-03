/**
 * Build query params strings from the keys and values of an object
 *
 * @param {Object} params The object to build the query from
 * @returns {String} The query string
 */
function buildQuery(params) {
  const keys = Object.keys(params);

  if (keys.length === 0) {
    return '';
  }

  return encodeURI(keys
    .reduce((acc, key) => `${acc}&${key}=${params[key] || ''}`, '?')
    .replace('?&', '?')
  );
}

module.exports = {
  buildQuery
};
