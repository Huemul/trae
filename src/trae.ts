import merge from 'lodash/merge';

import createMiddleware from './middleware';
import createResponse from '../lib/create-response';
import { format as formatUrl } from '../lib/url';
import { PublicRequestConfig, RequestConfig, InstanceConfig } from './types';

function createTrae(config: InstanceConfig = {}) {
  const middleware = createMiddleware();
  const defaults: InstanceConfig = {
    headers: { 'Content-Type': 'application/json' },
  };

  function request(endpoint: string, requestConfig: RequestConfig) {
    const fetchConfig = merge(defaults, config, requestConfig);
    const url = formatUrl(config.url, endpoint, fetchConfig.params);

    return middleware
      .resolveBefore(fetchConfig)
      .then((config) => fetch(url, config))
      .then((res) => createResponse(res, fetchConfig))
      .then(
        (res) => middleware.resolveAfter(undefined, res),
        (err) => middleware.resolveAfter(err, undefined),
      );
  }

  const trae = {
    create: (instanceConfig: InstanceConfig) => {
      const instance = createTrae(merge(config, instanceConfig));
      const { collections } = middleware;

      collections.before.forEach(instance.before);
      collections.after.forEach(([fulfilled, rejected]) =>
        instance.after(fulfilled, rejected),
      );

      return instance;
    },

    get: (endpoint: string, requestConfig: PublicRequestConfig = {}) =>
      request(endpoint, { ...requestConfig, method: 'GET' }),

    delete: (endpoint: string, requestConfig: PublicRequestConfig = {}) =>
      request(endpoint, { ...requestConfig, method: 'DELETE' }),

    head: (endpoint: string, requestConfig: PublicRequestConfig = {}) =>
      request(endpoint, { ...requestConfig, method: 'HEAD' }),

    post: (
      endpoint: string,
      body: any = {},
      requestConfig: PublicRequestConfig = {},
    ) => request(endpoint, { ...requestConfig, method: 'POST', body }),

    put: (
      endpoint: string,
      body: any = {},
      requestConfig: PublicRequestConfig = {},
    ) => request(endpoint, { ...requestConfig, method: 'PUT', body }),

    patch: (
      _endpoint: string,
      _body: any = {},
      _requestConfig: PublicRequestConfig = {},
    ) => {
      return;
    },

    before: middleware.before,

    after: middleware.after,
  };

  return trae;
}

export default createTrae;
