import { TraeSettings } from './types';

function isJSON({ headers }: TraeSettings) {
  const header = new Headers(headers).get('Content-Type') || '';

  return header.toLowerCase().includes('application/json');
}

function createRequestBody(content: unknown, config: TraeSettings) {
  if (isJSON(config)) {
    return JSON.stringify(content);
  }

  // TODO do not throw here, return a promise instead
  // TODO what does fetch do when body is invalid?
  throw new Error(`Invalid body type: ${typeof content}`);
}

export default createRequestBody;
