import merge from 'lodash/merge';

import createRequestBody from '../lib/create-request-body'
import createResponse from '../lib/create-response';
import { format as formatUrl } from '../lib/url';
import { TraeSettings, InstanceConfig } from './types';

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

  function request(endpoint: string, settings: TraeSettings) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

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
    const settings: TraeSettings = merge({}, config, requestConfig); 
    return request(endpoint, { ...settings, method: 'GET' });
  }

  function remove(endpoint: string, requestConfig: RequestInit = {}) {
    const settings: TraeSettings = merge({}, config, requestConfig); 
    return request(endpoint, { ...settings, method: 'DELETE' });
  }

  function head(endpoint: string, requestConfig: RequestInit = {}) {
    const settings: TraeSettings = merge({}, config, requestConfig); 
    return request(endpoint, { ...settings, method: 'HEAD' });
  }

  function post(
    endpoint: string,
    data: any = {},
    requestConfig: RequestInit = {},
  ) {
    const settings: TraeSettings = merge({}, config, requestConfig); 
    const body = createRequestBody(data, settings);
    return request(endpoint, { ...settings, method: 'POST', body });
  }

  function put(
    endpoint: string,
    data: any = {},
    requestConfig: RequestInit = {},
  ) {
    const settings: TraeSettings = merge({}, config, requestConfig);
    const body = createRequestBody(data, settings);
    return request(endpoint, { ...settings, method: 'PUT', body });
  }

  function patch(
    endpoint: string,
    data: any = {},
    requestConfig: RequestInit = {},
  ) {
    const settings: TraeSettings = merge({}, config, requestConfig);
    const body = createRequestBody(data, settings);
    return request(endpoint, { ...settings, method: 'PATCH', body });
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
