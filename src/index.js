require('whatwg-fetch');
const { EventEmitter } = require('events');


class Trae extends EventEmitter {
  constructor() {
    super();
    this._baseUrl = '';
  }

  init(opts = {}) {
    this._baseUrl     = opts.baseUrl;
    this._middlewares = opts.middlewares || [];
  }

  get(path, params) {
    const url    = `${this._baseUrl}${path}`;
    const config = this._runMiddlewares(this._fetchOptions({ body: params }));

    return fetch(url, config)
    .then(res => this._responseHandler(res));
  }

  post(path, data) {
    const url    = `${this._baseUrl}${path}`;
    const config = this._runMiddlewares(this._fetchOptions({ body: data, method: 'POST' }));

    return fetch(url, config)
    .then(res => this._responseHandler(res));
  }

  put(path, data) {
    const url    = `${this._baseUrl}${path}`;
    const config = this._runMiddlewares(this._fetchOptions({ body: data, method: 'PUT' }));

    return fetch(url, config)
    .then(res => this._responseHandler(res));
  }

  del(path) {
    const url    = `${this._baseUrl}${path}`;
    const config = this._runMiddlewares(this._fetchOptions({ method: 'DELETE' }));

    return fetch(url, config)
    .then(res => this._responseHandler(res));
  }

  _fetchOptions(opts = {}) {
    const fetchOpts = {
      method : opts.method || 'GET',
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
