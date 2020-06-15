import createRequestBody from './create-request-body';
import { format as formatUrl } from './url';
import { TraeSettings, InstanceConfig } from './types';
import { merge } from './utils';

const defaults: RequestInit = {
  headers: { 'Content-Type': 'application/json' },
};

function createTrae(providedConf?: Partial<TraeSettings>) {
  const config: TraeSettings = Object.freeze(
    merge(defaults, {
      before: (conf: RequestInit) => conf,
      ...providedConf,
    }),
  );

  function request(endpoint: string, settings: TraeSettings) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

    const url = formatUrl(settings.url, endpoint, settings.params);

    return fetch(url, config.before(settings));
  }

  function create(instanceConfig: InstanceConfig) {
    return createTrae(merge(config, instanceConfig));
  }

  function get(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, { ...settings, method: 'GET' });
  }

  function remove(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, { ...settings, method: 'DELETE' });
  }

  function head(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, { ...settings, method: 'HEAD' });
  }

  function post(
    endpoint: string,
    body: unknown = {},
    requestConfig?: RequestInit,
  ) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'POST',
      body: createRequestBody(body, settings),
    });
  }

  function put(
    endpoint: string,
    body: unknown = {},
    requestConfig?: RequestInit,
  ) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'PUT',
      body: createRequestBody(body, settings),
    });
  }

  function patch(
    endpoint: string,
    body: unknown = {},
    requestConfig?: RequestInit,
  ) {
    const settings: TraeSettings = merge(config, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'PATCH',
      body: createRequestBody(body, settings),
    });
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
