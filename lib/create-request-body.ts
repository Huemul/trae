import { TraeSettings } from '../src/types';
import { isValidBody, isHeaders } from './guards';

function isJSON({ headers }: TraeSettings) {
  if (!headers) {
    return false;
  }

  if (isHeaders(headers)) {
    const headerValue = headers.get('Content-Type') || '';
    return headerValue.toLowerCase().includes('application/json');
  }

  if (Array.isArray(headers)) {
    return headers.some(
      ([name, value]) =>
        name.toLowerCase() === 'content-type' &&
        value.toLowerCase().includes('application/json'),
    );
  }

  return Object.keys(headers).some(
    (name: string) =>
      name.toLowerCase().includes('content-type') &&
      headers[name].toLowerCase().includes('application/json'),
  );
}

function createRequestBody(content: unknown, config: TraeSettings) {
  if (isJSON(config)) {
    return JSON.stringify(content);
  }

  if (isValidBody(content)) {
    return content;
  }

  // TODO do not throw here, return a promise instead
  // TODO what does fetch do when body is invalid?
  throw new Error(`Invalid body type: ${typeof content}`);
}

export default createRequestBody;
