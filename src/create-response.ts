import { BodyType, TraeSettings } from './types';
import { isFormData, isBlob, isArrayBuffer, isValidReader } from './guards';

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

function deriveReader(response: Response, config: TraeSettings): BodyType {
  const { bodyType } = config;
  const { headers, body } = response;

  if (bodyType && isValidReader(bodyType)) {
    return bodyType;
  }

  const contentType = headers.get('Content-Type') || '';

  if (contentType.toLowerCase().includes('application/json')) {
    return 'json';
  }

  if (
    contentType.toLowerCase().includes('multipart/form-data') ||
    isFormData(body)
  ) {
    return 'formData';
  }

  if (isArrayBuffer(body)) {
    return 'arrayBuffer';
  }

  if (isBlob(body)) {
    // TODO: Investigate edge cases
    //       https://stackoverflow.com/a/55271454/3377073
    return 'blob';
  }

  return 'text';
}

interface TraeResponse {
  status: number;
  statusText: string;
  data: unknown;
}

// TODO: we should return one type or the other depending on the reader type so
// the user doesn't get the union always but the right type according to the
// config they have
type ParsedResponse = Promise<Response | TraeResponse>;

function parseResponse(
  response: Response,
  config: TraeSettings,
): ParsedResponse {
  const reader = deriveReader(response, config);

  return reader === 'raw'
    ? Promise.resolve(response)
    : response[reader]().then((data: unknown) => ({
        status: response.status,
        statusText: response.statusText,
        data,
      }));
}

const createResponse = (config: TraeSettings) => (response: Response) => {
  if (response.ok) {
    return parseResponse(response, config);
  }

  const error = new TraeResponseError({
    message: response.statusText,
    config,
    response,
  });

  // TODO: Why isn't the parsed response part of the object we reject with?
  return parseResponse(response, config).then(() => Promise.reject(error));
};

export default createResponse;
