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

// upgradeResponse :: Response -> Reader -> Promise
function upgradeResponse(response, obj, reader) {
  obj.headers    = response.headers;
  obj.status     = response.status;
  obj.statusText = response.statusText;

  reader = defineReader(response.headers, reader);

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
// responseHandler :: Response -> Reader -> Promise
export default function responseHandler(response, reader) {
  if (!response.ok) {
    const err = new Error(response.statusText);
    return upgradeResponse(response, err)
      .then((e) => { throw e; });
  }

  return upgradeResponse(response, {}, reader);
}

