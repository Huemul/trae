require('whatwg-fetch');
const buildQuery = require('trae-query').buildQuery;
const Middleware = require('./middleware');


class Trae {
  constructor() {
    this._baseUrl    = '';
    this._middleware = new Middleware();

    this._initMethodsWithBody();
    this._initMethodsWithNoBody();
  }

  init(opts = {}) {
    if (opts.baseUrl) {
      this._baseUrl = opts.baseUrl;
    }
  }

  use(middlewares = {}) {
    if (middlewares.config) {
      this.middleware.request(middlewares.config);
    }
    if (middlewares.fulfill || middlewares.reject) {
      this.middleware.response(middlewares.fulfill, middlewares.reject);
    }
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
        const url         = buildQuery(`${this._baseUrl}${path}`, config.params);
        const defaultConf = this.constructor._defaultConfig({ method });

        return this._fetch(url, Object.assign({}, defaultConf, config));
      };
    });
  }

  _initMethodsWithBody() {
    ['post', 'put', 'patch'].forEach((method) => {
      this[method] = (path, body, config) => {
        const url         = `${this._baseUrl}${path}`;
        const defaultConf = this.constructor._defaultConfig({ body, method });

        return this._fetch(url, Object.assign({}, defaultConf, config));
      };
    });
  }

  static _defaultConfig(opts = {}) {
    const config = {
      method : opts.method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (opts.body) {
      config.body = JSON.stringify(opts.body);
    }
    return config;
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

exports = module.exports = new Trae();
exports.Trae = Trae;
