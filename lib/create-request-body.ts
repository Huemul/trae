import { TraeSettings } from '../src/types';

function isJSON(config: TraeSettings) {
  const headers = config.headers;
  // @ts-ignore
  const key = Object.keys(headers).find(
    // @ts-ignore
    (header: any) => header.toLowerCase() === 'content-type',
  );
  // @ts-ignore
  return key && headers[key].toLowerCase() === 'application/json';
}

function createRequestBody(content: any, config: TraeSettings) {
  return isJSON(config) ? JSON.stringify(content) : content;
}

export default createRequestBody;
