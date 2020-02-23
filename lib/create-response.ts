import { BodyType, TraeSettings } from '../src/types';

const isValidReader = (reader: string): reader is BodyType =>
  ['arrayBuffer', 'blob', 'formData', 'json', 'text', 'raw'].includes(reader);

function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

interface TraeResponseErrorArgs {
  message: string;
  config: TraeSettings;
  response: Response;
}
class TraeResponseError extends Error {
  config: TraeSettings;
  response: Response;

  constructor({ message, config, response }: TraeResponseErrorArgs) {
    super(message);
    this.config = config;
    this.response = response;
  }
}

function deriveReader(response: Response, config: TraeSettings) {
  const { bodyType } = config;
  const { headers, body } = response;

  if (bodyType && isValidReader(bodyType)) {
    return bodyType;
  }

  const contentType = headers.get('Content-Type');

  if (contentType === 'application/json') {
    return 'json';
  }

  if (contentType === 'multipart/form-data' || isFormData(body)) {
    return 'formData';
  }

  if (body instanceof ArrayBuffer) {
    return 'arrayBuffer';
  }

  if (body instanceof Blob) {
    // TODO: Investigate edge cases
    //       https://stackoverflow.com/a/55271454/3377073
    return 'blob';
  }

  return 'text';
}

function parseResponse(response: Response, config: TraeSettings) {
  const reader = deriveReader(response, config);

  return reader === 'raw'
    ? Promise.resolve(response)
    : response[reader]().then((data: unknown) => ({
        status: response.status,
        statusText: response.statusText,
        data,
      }));
}

export default function createResponse(
  response: Response,
  config: TraeSettings,
) {
    if (response.ok) {
      return parseResponse(response, config);
    }

    const error = new TraeResponseError({
      message: response.statusText,
      config,
      response,
    });

    // TODO: Why isn't the parsed response part of the object we reject with?
    // @ts-ignore
    return parseResponse(response, config).then(() => Promise.reject(error));
  }
