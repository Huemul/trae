require('whatwg-fetch');
const buildQuery = require('trae-query').buildQuery;

const Middleware = require('./middleware');
const Config     = require('./config');
const skip       = require('./utils').skip;

class Trae {
  constructor(config = {}) {
    this._middleware = new Middleware();
    this._config     = new Config(skip(config, ['baseUrl']));

    this.baseUrl(config.baseUrl || '');
    this._initMethodsWithBody();
    this._initMethodsWithNoBody();
  }

  create(config) {
    return new this.constructor(config);
  }

  use(middlewares = {}) {
    if (middlewares.config) {
      this.middleware.request(middlewares.config);
    }
    if (middlewares.fulfill || middlewares.reject) {
      this.middleware.response(middlewares.fulfill, middlewares.reject);
    }
  }

  defaults(config) {
    if (typeof config === 'undefined') {
      return this._config.get();
    }
    this._config.set(skip(config, ['baseUrl']));
    config.baseUrl && this.baseUrl(config.baseUrl);
    return this._config.get();
  }

  baseUrl(baseUrl) {
    if (typeof baseUrl === 'undefined') {
      return this._baseUrl;
    }
    this._baseUrl = baseUrl;
    return this._baseUrl;
  }

  _fetch(url, config) {
    return this._middleware.resolveRequests(config)
    .then(config => fetch(url, config))
    .then(res => this.constructor._responseHandler(res))
    .then(res => this._middleware.resolveResponses(res));
  }

  _initMethodsWithNoBody() {
    ['get', 'delete', 'head'].forEach((method) => {
      this[method] = (path, config = {}) => {
        const mergedConfig = this._config.mergeWithDefaults(config, { method });
        const url          = buildQuery(`${this._baseUrl}${path}`, config.params);

        return this._fetch(url, mergedConfig);
      };
    });
  }

  _initMethodsWithBody() {
    ['post', 'put', 'patch'].forEach((method) => {
      this[method] = (path, body, config) => {
        const mergedConfig = this._config.mergeWithDefaults(config, { body, method });
        const url          = `${this._baseUrl}${path}`;

        return this._fetch(url, mergedConfig);
      };
    });
  }

  static _responseHandler(response) {
    if (!response.ok) {
      const err = new Error(response.statusText);
      err.status = response.status;
      return Promise.reject(err);
    }
    if (response.headers.get('Content-Type') === 'application/json') {
      return response.json();
    }
    return response.text();
  }

}

module.exports = new Trae();
