import { format as formatUrl } from './url';
import { TraeSettings } from './types';
import { merge } from './utils';
import { TraeError } from './error';


function createTrae(providedConfig: Partial<TraeSettings> = {}) {
  // TODO: Object.freeze
  const defaults: TraeSettings = {
    before: (conf: RequestInit) => conf,
    after: (res: any) => res,
    headers: providedConfig.json ? { 'Content-Type': 'application/json' } : {},
    ...providedConfig,
  };

  async function request(endpoint: string, settings: TraeSettings) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

    const url = formatUrl(settings.url, endpoint, settings.params);

    const res = await fetch(url, defaults.before(settings))
    if (!res.ok) {
      throw new TraeError(res.statusText, res.status);
    }

    return defaults.after({
      status: res.status,
      statusText: res.statusText,
      data: settings.json ? await res.json() : res
    }, settings)
  }

  function create(instanceConfig: Partial<TraeSettings>) {
    return createTrae(merge(defaults, instanceConfig));
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

  function patch(endpoint: string, body: BodyInit, requestConfig?: RequestInit) {
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
    getConfig: () => defaults,
  };
}

export default createTrae();
