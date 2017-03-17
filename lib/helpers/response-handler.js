// Reader :: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'raw'
const READERS = ['arrayBuffer', 'blob', 'formData', 'json', 'text', 'raw'];

// validateReader :: Reader -> Bool
const validateReader = reader => READERS.includes(reader);

// defineReader :: Headers -> String -> String
function defineReader(headers, reader) {
  if (validateReader(reader)) {
    return reader;
  }
  const contentType = headers.get('Content-Type') || '';
  return contentType.includes('application/json')
    ? 'json'
    : 'text';
}

// upgradeResponse :: Response -> Object -> Promise
function upgradeResponse(response, obj) {
  obj.headers    = response.headers;
  obj.status     = response.status;
  obj.statusText = response.statusText;

  const reader = defineReader(response.headers, obj.config.bodyType);

  if (reader === 'raw') {
    obj.data = response.body;
    return Promise.resolve(obj);
  }

  return response[reader]()
    .then((data) => {
      obj.data = data;
      return obj;
    });
}

// Reads or rejects a fetch response
// responseHandler :: Response -> Object -> Promise
export default function responseHandler(response, config) {
  if (!response.ok) {
    const err  = new Error(response.statusText);
    err.config = config;
    return upgradeResponse(response, err)
      .then((e) => { throw e; });
  }

  return upgradeResponse(response, { config });
}

