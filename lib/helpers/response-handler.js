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
    headers   : response.headers,
    status    : response.status,
    statusText: response.statusText,
    data
  }));
}

/**
 * Reads or rejects a fetch request response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} read or rejection promise
 */
export default function responseHandler(response, reader) {
  if (!response.ok) {
    const err       = new Error(response.statusText);
    err.status      = response.status;
    err.statusText  = response.statusText;
    err.headers     = response.headers;
    return Promise.reject(err);
  }
  if (reader) {
    return wrapResponse(response, reader);
  }

  const contentType = response.headers.get('Content-Type');
  if (contentType && contentType.includes('application/json')) {
    return wrapResponse(response, 'json');
  }
  return wrapResponse(response, 'text');
}
