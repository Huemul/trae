import merge from 'lodash/merge';

import createResponse from '../lib/create-response';
import { format as formatUrl } from '../lib/url';
import { PublicRequestConfig, RequestConfig, InstanceConfig } from './types';

function createTrae(config: InstanceConfig = {}) {
  const defaults: InstanceConfig = {
    headers: { 'Content-Type': 'application/json' },
    middleware: {
      before: (item: any) => Promise.resolve(item),
      after: [
        (item: any) => Promise.resolve(item),
        (err: any) => Promise.reject(err)
      ]
    }
  };

  function request(endpoint: string, requestConfig: RequestConfig) {
    // TODO: We should extract some attributes to avoid exposing unnecessary
    //       data to the before middleware and fetch function.
    //       Example: 'middleware' attribute.

    const settings = merge(defaults, config, requestConfig);
    const url = formatUrl(config.url, endpoint, settings.params);
    const middleware = settings.middleware;

    return middleware
      .before(settings)
      .then((config: any) => fetch(url, config))
      .then((res: any) => createResponse(res, settings))
      .then(...middleware.after)
  }

  function create (instanceConfig: InstanceConfig) {
    return createTrae(merge(config, instanceConfig))
  }

  function get (endpoint: string, requestConfig: PublicRequestConfig = {}) {
    return request(endpoint, { ...requestConfig, method: 'GET' })
  }

  function remove (endpoint: string, requestConfig: PublicRequestConfig = {}) {
    return request(endpoint, { ...requestConfig, method: 'DELETE' })
  }

  function head (endpoint: string, requestConfig: PublicRequestConfig = {}) {
    return request(endpoint, { ...requestConfig, method: 'HEAD' })
  }

  function post (
    endpoint: string,
    body: any = {},
    requestConfig: PublicRequestConfig = {},
  ) {
    return request(endpoint, { ...requestConfig, method: 'POST', body })
  }

  function put(
    endpoint: string,
    body: any = {},
    requestConfig: PublicRequestConfig = {},
  ) {
    return request(endpoint, { ...requestConfig, method: 'PUT', body })
  }

  // TODO implement
  function patch (
    _endpoint: string,
    _body: any = {},
    _requestConfig: PublicRequestConfig = {},
  ) {
    return
  }

  return {
    create,
    get,
    delete: remove,
    head,
    post,
    put,
    patch
  }
}

export default createTrae;
