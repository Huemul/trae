const READERS = ['arrayBuffer', 'blob', 'formData', 'json', 'text'];
const isValidReader = reader => READERS.includes(reader);

class TraeResponseError extends Error {
  constructor ({ message, config, response }) {
    super(message)
    this.config = config
    this.response = response
  }
}

function deriveReader(response, config) {
  const { bodyType } = config
  const { headers, body } = response

  if (isValidReader(bodyType)) {
    return bodyType
  }

  const contentType = headers.get('Content-Type')

  if (contentType && contentType === 'application/json') {
    return 'json'
  } else if (
    contentType && contentType === 'multipart/form-data' ||
    body instanceof FormData
  ) {
    return 'formData'
  } else if (body instanceof ArrayBuffer) {
    return 'arrayBuffer'
  } else if (body instanceof Blob) {
    // TODO: Investigate edge cases
    //       https://stackoverflow.com/a/55271454/3377073
    return 'blob'
  } else {
    return 'text'
  }
}

function parseResponse(response, config) {
  const { body, headers, status, statusText } = response;
  const res = { headers, status, statusText, body }

  const reader = deriveReader(res, config);

  return response[reader]()
    .then((data) => ({ ...res, data }))
}

export default function createResponse (response, config) {
  if (!response.ok) {
    return parseResponse(response, config)
      .then((data) => Promise.reject(new TraeResponseError({
        message: response.statusText,
        config,
        response
      })))
  }

  return parseResponse(response, config)
}