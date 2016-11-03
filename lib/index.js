require('whatwg-fetch');
const { EventEmitter } = require('events');
const { buildQuery } = require('./utils');

class Trae extends EventEmitter {
  constructor() {
    super();
    this._baseUrl = '';
    this.initMethodsWithBody();
    this.initMethodsWithNoBody();
  }

  init(opts = {}) {
    this._baseUrl     = opts.baseUrl;
    this._middlewares = opts.middlewares || [];
  }

  initMethodsWithNoBody() {
    ['get', 'delete', 'head'].forEach((method) => {
      this[method] = (path, params) => {
        const url    = `${this._baseUrl}${path}${buildQuery(params)}`;
        const config = this._runMiddlewares(this._fetchOptions({ method }));

        return fetch(url, config)
        .then(res => this._responseHandler(res));
      };
    });
  }

  initMethodsWithBody() {
    ['post', 'put', 'patch'].forEach((method) => {
      this[method] = (path, body) => {
        const url    = `${this._baseUrl}${path}`;
        const config = this._runMiddlewares(this._fetchOptions({ body, method }));

        return fetch(url, config)
        .then(res => this._responseHandler(res));
      };
    });
  }


  _fetchOptions(opts = {}) {
    const fetchOpts = {
      method : opts.method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (this.isAuthenticated) {
      fetchOpts.headers.authorization = this.token;
    }
    if (opts.body) {
      fetchOpts.body = JSON.stringify(opts.body);
    }
    return fetchOpts;
  }

  _responseHandler(response) {
    if (response.ok) { return response.json(); }
    this.emit('trae:error', {
      status    : response.status,
      statusText: response.statusText
    });
    return Promise.reject(new Error(`${response.status}: ${response.statusText}`));
  }

  _runMiddlewares(config) {
    this._middlewares.forEach(middleware => middleware(config));
    return config;
  }
}

exports = module.exports = new Trae();
exports.Trae = Trae;
