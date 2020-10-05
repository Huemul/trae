// @ts-nocheck

import { format as formatUrl } from './url';
import { TraeSettings, TraeResponse } from './types';
// import { merge } from './utils';
import { TraeError } from './error';
import merge from 'merge';

function createTrae(providedConfig: Partial<TraeSettings> = {}) {
  // TODO: Implement Object.freeze with TS
  const defaults: TraeSettings = {
    before: (conf: RequestInit) => conf,
    after: (res: any) => res,
    headers: {},
    ...providedConfig,
  };

  // TODO: Fix TS
  if (providedConfig.json) {
    defaults.headers['Content-Type'] = 'application/json';
  }

  async function request(endpoint: string, settings: TraeSettings) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

    const url = formatUrl(settings.url, endpoint, settings.params);
    const options = defaults.before(settings);
    const res: TraeResponse = await fetch(url, options);

    if (!res.ok) {
      throw new TraeError(res.statusText, res.status);
    }

    if (settings.json) {
      res.data = await res.json(); 
    }

    return defaults.after(res, settings);
  }

  function create(instanceConfig: Partial<TraeSettings>) {
    return createTrae(merge({}, defaults, instanceConfig));
  }

  function get(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, { ...settings, method: 'GET' });
  }

  function remove(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, { ...settings, method: 'DELETE' });
  }

  function head(endpoint: string, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, { ...settings, method: 'HEAD' });
  }

  function post(endpoint: string, body: BodyInit, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'POST',
      body: settings.json ? JSON.stringify(body) : body,
    });
  }

  function put(endpoint: string, body: BodyInit, requestConfig?: RequestInit) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'PUT',
      body: settings.json ? JSON.stringify(body) : body,
    });
  }

  function patch(
    endpoint: string,
    body: BodyInit,
    requestConfig?: RequestInit,
  ) {
    const settings: TraeSettings = merge(defaults, requestConfig);
    return request(endpoint, {
      ...settings,
      method: 'PATCH',
      body: settings.json ? JSON.stringify(body) : body,
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
    config: defaults,
  };
}

export default createTrae();
