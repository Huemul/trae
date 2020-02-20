import merge from 'lodash/merge';

import createResponse from '../lib/create-response';
import { format as formatUrl } from '../lib/url';
import { TraeSettings, RequestConfig, InstanceConfig } from './types';

const defaults: RequestInit = {
  headers: { 'Content-Type': 'application/json' },
};

function createTrae(providedConf?: Partial<TraeSettings>) {
  const config: TraeSettings = Object.freeze(merge(defaults, {
    before: (conf: RequestInit) => conf,
    onResolve: (item: unknown) => Promise.resolve(item),
    onReject: (err: unknown) => Promise.reject(err),
    ...providedConf,
  }));

  function request(endpoint: string, requestConfig: RequestConfig) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

    const settings: TraeSettings = merge(config, requestConfig);
    const url = formatUrl(settings.url, endpoint, settings.params);

    return fetch(url, config.before(settings))
      .then((res: any) => createResponse(res, settings))
      .then(config.onResolve)
      .catch(config.onReject);
  }

  function create(instanceConfig: InstanceConfig) {
    return createTrae(merge(config, instanceConfig));
  }

  function get(endpoint: string, requestConfig: RequestInit = {}) {
    return request(endpoint, { ...requestConfig, method: 'GET' });
  }

  function remove(endpoint: string, requestConfig: RequestInit = {}) {
    return request(endpoint, { ...requestConfig, method: 'DELETE' });
  }

  function head(endpoint: string, requestConfig: RequestInit = {}) {
    return request(endpoint, { ...requestConfig, method: 'HEAD' });
  }

  function post(
    endpoint: string,
    body: any = {},
    requestConfig: RequestInit = {},
  ) {
    return request(endpoint, { ...requestConfig, method: 'POST', body });
  }

  function put(
    endpoint: string,
    body: any = {},
    requestConfig: RequestInit = {},
  ) {
    return request(endpoint, { ...requestConfig, method: 'PUT', body });
  }

  function patch(
    endpoint: string,
    body: any = {},
    requestConfig: RequestInit = {},
  ) {
    return request(endpoint, { ...requestConfig, method: 'PATCH', body });
  }

  return {
    create,
    get,
    delete: remove,
    head,
    post,
    put,
    patch,
    config,
  };
}

export default createTrae();
