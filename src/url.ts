import { stringify as stringifyParams } from 'query-string';

interface Params {
  [x: string]: unknown;
}

export function concatParams(URL: string, params?: Params) {
  return params ? `${URL}?${stringifyParams(params)}`.replace(/\?$/, '') : URL;
}

export function combine(baseURL: string, relativeURL: string) {
  return `${baseURL.replace(/\/+$/, '')}/${relativeURL.replace(/^\/+/, '')}`;
}

export function isAbsolute(url: string) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d+-.]*:)?\/\//i.test(url);
}

export function format(
  baseUrl: string | undefined,
  relativeURL: string,
  params?: Params,
) {
  if (!baseUrl || isAbsolute(relativeURL)) {
    return concatParams(relativeURL, params);
  }

  return concatParams(combine(baseUrl, relativeURL), params);
}
