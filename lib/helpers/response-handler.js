// Reader :: 'arrayBuffer' | 'blob' | 'formData' | 'json' | 'text' | 'raw'
const READERS = ['arrayBuffer', 'blob', 'formData', 'json', 'text', 'raw']

// validateReader :: Reader -> Bool
const validateReader = (reader) => READERS.includes(reader)

// defineReader :: Bool -> Headers -> String -> String
function defineReader(ok, headers, reader) {
  if (ok && validateReader(reader)) {
    return reader
  }

  const contentType = headers.get('Content-Type') || ''
  return contentType.includes('application/json') ? 'json' : 'text'
}

// upgradeResponse :: Response -> Object -> Promise
function upgradeResponse(response, obj) {
  const { ok, headers, status, statusText } = response
  const {
    config: { bodyType },
  } = obj

  obj.headers = headers
  obj.status = status
  obj.statusText = statusText

  const reader = defineReader(ok, headers, bodyType)

  if (reader === 'raw') {
    obj.data = response.body
    return Promise.resolve(obj)
  }

  if (response.body === undefined) {
    obj.data = undefined
    return Promise.resolve(obj)
  }

  return response[reader]().then((data) => {
    obj.data = data
    return obj
  })
}

// Reads or rejects a fetch response
// responseHandler :: Response -> Object -> Promise
export default function responseHandler(response, config) {
  if (!response.ok) {
    const err = new Error(response.statusText)
    err.config = config
    return upgradeResponse(response, err).then((e) => {
      throw e
    })
  }

  return upgradeResponse(response, { config })
}
