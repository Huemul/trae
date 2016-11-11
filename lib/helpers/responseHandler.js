/**
 * Wrapp a response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} resolves to the wrapped read response
 */
function wrapResponse(response, reader) {
  return response[reader]()
  .then(data => ({
    headers: response.headers,
    status: response.status,
    data
  }));
}

/**
 * Reads or rejects a fetch request response
 *
 * @param {Object} response response object
 * @return {Promise} read or rejection promise
 */
function responseHandler(response) {
  if (!response.ok) {
    const err   = new Error(response.statusText);
    err.status  = response.status;
    err.headers = response.headers;
    return Promise.reject(err);
  }
  if (response.headers.get('Content-Type') === 'application/json') {
    return wrapResponse(response, 'json');
  }
  return wrapResponse(response, 'text');
}

module.exports = responseHandler;
