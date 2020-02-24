import { TraeSettings } from '../src/types';
import { isFormData } from './create-response';

function isJSON({ headers }: TraeSettings) {
  if (!headers) {
    return false;
  }

  if (Array.isArray(headers)) {
    const result = headers.find(
      ([headerName]) => headerName.toLowerCase() === 'content-type',
    );
    const [, headerValue] = result || ['', ''];

    return headerValue.toLowerCase().includes('application/json');
  }

  if (headers instanceof Headers) {
    const headerValue = headers.get('Content-Type') || '';

    return headerValue.toLowerCase().includes('application/json');
  }

  const key =
    Object.keys(headers).find((header: string) =>
      header.toLowerCase().includes('content-type'),
    ) || '';

  const headerValue = headers[key] || '';

  return headerValue.toLowerCase().includes('application/json');
}

// TODO: this function is inconplete
function isValidBody(content: unknown): content is BodyInit {
  if (typeof content === 'string') {
    return true;
  }
  if (typeof ArrayBuffer !== 'undefined' && content instanceof ArrayBuffer) {
    return true;
  }
  if (typeof Blob !== 'undefined' && content instanceof Blob) {
    return true;
  }
  if (isFormData(content)) {
    return true;
  }
  if (
    typeof ReadableStream !== 'undefined' &&
    content instanceof ReadableStream
  ) {
    return true;
  }

  return false;
}

function createRequestBody(content: unknown, config: TraeSettings) {
  if (isValidBody(content)) {
    return isJSON(config) ? JSON.stringify(content) : content;
  }

  // TODO do not throw here
  // TODO what does fetch do when body is invalid?
  throw new Error(`Invalid body type: ${typeof content}`);
}

export default createRequestBody;
