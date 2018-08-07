import { format as formatUrl } from './helpers/url-handler'
import { skip, merge } from './utils'
import Middleware from './middleware'
import Config from './config'
import responseHandler from './helpers/response-handler'
import { version } from '../package.json'

class Trae {
  constructor(config = {}) {
    this._middleware = new Middleware()
    this._config = new Config(skip(config, ['baseUrl']))

    this.baseUrl(config.baseUrl || '')
    this._setupMethodsWithBody()
    this._setupMethodsWithNoBody()
    this._setupMiddlewareMethods()

    this.version = version
  }

  create(config) {
    const instance = new this.constructor(merge(this.defaults(), config))
    const mapAfter = ({ fulfill, reject }) => instance.after(fulfill, reject)
    this._middleware._before.forEach(instance.before)
    this._middleware._after.forEach(mapAfter)
    this._middleware._finally.forEach(instance.finally)
    return instance
  }

  defaults(config) {
    if (typeof config === 'undefined') {
      const defaults = this._config.get()
      this.baseUrl() && (defaults.baseUrl = this.baseUrl())
      return defaults
    }
    this._config.set(skip(config, ['baseUrl']))
    config.baseUrl && this.baseUrl(config.baseUrl)
    return this._config.get()
  }

  baseUrl(baseUrl) {
    if (typeof baseUrl === 'undefined') {
      return this._baseUrl
    }
    this._baseUrl = baseUrl
    return this._baseUrl
  }

  request(config = {}) {
    config.method || (config.method = 'get')
    const mergedConfig = this._config.merge(config)
    const url = formatUrl(this._baseUrl, config.url, config.params)

    return this._fetch(url, mergedConfig)
  }

  _fetch(url, originalConfig) {
    const config = merge(originalConfig, {
      method: originalConfig.method.toUpperCase(),
    })
    const onceDone = (...args) => this._middleware.resolveFinally(...args)

    return this._middleware
      .resolveBefore(config)
      .then((c) => fetch(url, c))
      .then((res) => responseHandler(res, config))
      .then(
        (res) => this._middleware.resolveAfter(undefined, res),
        (err) => this._middleware.resolveAfter(err),
      )
      .then(
        (res) => Promise.resolve(onceDone(config, url)).then(() => res),
        (err) =>
          Promise.resolve(onceDone(config, url)).then(() =>
            Promise.reject(err),
          ),
      )
  }

  _setupMethodsWithNoBody() {
    const fetch = (path, config, method) => {
      const url = formatUrl(this._baseUrl, path, config.params)
      const mergedConfig = this._config.merge(config, { method, url })

      return this._fetch(url, mergedConfig)
    }

    this.get = (path, config = {}) => fetch(path, config, 'get')
    this.delete = (path, config = {}) => fetch(path, config, 'delete')
    this.head = (path, config = {}) => fetch(path, config, 'head')
  }

  _setupMethodsWithBody() {
    const defaultConfig = {
      headers: { 'Content-Type': 'application/json' },
    }

    this._config.set({ post: defaultConfig })
    this._config.set({ put: defaultConfig })
    this._config.set({ patch: defaultConfig })

    const fetch = (path, body, config, method) => {
      const url = formatUrl(this._baseUrl, path, config.params)
      const mergedConfig = this._config.merge(config, { body, method, url })

      return this._fetch(url, mergedConfig)
    }

    this.post = (path, body = {}, config = {}) =>
      fetch(path, body, config, 'post')
    this.put = (path, body = {}, config = {}) =>
      fetch(path, body, config, 'put')
    this.patch = (path, body = {}, config = {}) =>
      fetch(path, body, config, 'patch')
  }

  _setupMiddlewareMethods() {
    this.before = (...args) => this._middleware.before(...args)
    this.after = (...args) => this._middleware.after(...args)
    this.finally = (...args) => this._middleware.finally(...args)
  }
}

export default new Trae()
