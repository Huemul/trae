import { BodyType, PublicRequestConfig } from '../src/types';

const isValidReader = (reader: string): reader is BodyType =>
  ['arrayBuffer', 'blob', 'formData', 'json', 'text'].includes(reader);

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

interface TraeResponseErrorArgs {
  message: string;
  config: PublicRequestConfig;
  response: Response;
}
class TraeResponseError extends Error {
  config: PublicRequestConfig;
  response: Response;

  constructor({ message, config, response }: TraeResponseErrorArgs) {
    super(message);
    this.config = config;
    this.response = response;
  }
}

function deriveReader(response: Response, config: PublicRequestConfig) {
  const { bodyType } = config;
  const { headers, body } = response;

  if (bodyType && isValidReader(bodyType)) {
    return bodyType;
  }

  const contentType = headers.get('Content-Type');

  if (contentType && contentType === 'application/json') {
    return 'json';
  } else if (
    (contentType && contentType === 'multipart/form-data') ||
    isFormData(body)
  ) {
    return 'formData';
  } else if (body instanceof ArrayBuffer) {
    return 'arrayBuffer';
  } else if (body instanceof Blob) {
    // TODO: Investigate edge cases
    //       https://stackoverflow.com/a/55271454/3377073
    return 'blob';
  } else {
    return 'text';
  }
}

function parseResponse(response: Response, config: PublicRequestConfig) {
  const reader = deriveReader(response, config);

  return response[reader]().then((data: unknown) => ({ ...response, data }));
}

export default function createResponse(
  response: Response,
  config: PublicRequestConfig,
) {
  if (response.ok) {
    return parseResponse(response, config);
  }

  const error = new TraeResponseError({
    message: response.statusText,
    config,
    response,
  });

  return parseResponse(response, config).then(() => Promise.reject(error));
}
