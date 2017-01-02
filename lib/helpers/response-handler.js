/**
 * Wrap a response
 *
 * @param {Object} response response object
 * @param {String} reader type of reader to use on response body
 * @return {Promise} resolves to the wrapped read response
 */
function wrapResponse(response, reader) {
  const res = {
    headers   : response.headers,
    status    : response.status,
    statusText: response.statusText
  };

  if (reader === 'raw') {
    res.data = response.body;
    return res;
  }

  return response[reader]()
  .then((data) => {
    res.data = data;
    return res;
  });
}

/**
 * Reads or rejects a fetch response
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
