const READERS = ['arrayBuffer', 'blob', 'formData', 'json', 'text'];
const isValidReader = reader => READERS.includes(reader);

class TraeResponseError extends Error {
  constructor ({ message, config, status, statusText }) {
    super(message)
    this.config = config
    this.status = status
    this.statusText = statusText
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

fetch;

function parseResponse(response, config) {
  const { body, headers, status, statusText } = response;

  const response = {
    response,
    headers,
    status,
    statusText,
    body
  }

  const reader = deriveReader(response, config);

  return response[reader]()
    .then((data) => ({ ...response, data }))
}

export default function createResponse (response, config) {
  if (!response.ok) {
    return Promise.reject(new TraeResponseError({
      message: response.statusText,
      statusText: response.statusText,
      status: response.status,
      config: config
    }))
  }

  return parseResponse(response, config)
}