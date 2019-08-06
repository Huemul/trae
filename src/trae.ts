import merge from 'lodash/merge'

import createMiddleware from './middleware'
import createResponse from '../lib/create-response'
import { format as formatUrl } from '../lib/url';

function createTrae (config = {}) {
  const middleware = createMiddleware()
  const defaults = {
    headers: { 'Content-Type': 'application/json' }
  }

  function request(url, requestConfig) {
    const fetchConfig = merge(defaults, config, requestConfig)
    const url = formatUrl(config.url, url, fetchConfig.params)

    return middleware.resolveBefore(fetchConfig)
      .then(config => fetch(url, config))
      .then(res => createResponse(res, fetchConfig))
      .then(
        res => middleware.resolveAfter(undefined, res),
        err => middleware.resolveAfter(err)
      )
  }

  const trae = {
    create: (instanceConfig) => {
      const instance = createTrae(merge(config, instanceConfig))
      const { collections } = middleware

      collections.before.forEach(instance.before);
      collections.after.forEach((args) => instance.after(...args));

      return instance;
    },

    get: (endpoint, requestConfig = {}) => {
      return request(endpoint, merge(requestConfig, { method: 'GET' }))
    },

    delete: (endpoint, requestConfig = {}) => {
      return request(endpoint, merge(requestConfig, { method: 'DELETE' }))
    },

    head: (endpoint, requestConfig = {}) => {
      return request(endpoint, merge(requestConfig, { method: 'HEAD' }))
    },

    post: (endpoint, body = {}, requestConfig = {}) => {
      return request(endpoint, merge(requestConfig, { method: 'POST', body }))
    },

    put: (endpoint, body = {}, requestConfig = {}) => {
      return request(endpoint, merge(requestConfig, { method: 'PUT', body }))
    },

    patch: () => {
      return request(endpoint, merge(requestConfig, { method: 'PATCH', body }))
    },

    before: (fn) => {
      return middleware.before(fn)
    },

    after: (resolve, reject) => {
      return middleware.before(resolve, reject)
    }
  }

  return trae
}

export default createTrae