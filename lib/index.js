import 'whatwg-fetch';
import query from 'trae-query';

import Middleware      from './middleware';
import Config          from './config';
import { skip }        from './utils';
import { format }      from './helpers/url-handler';
import responseHandler from './helpers/response-handler';

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
    middlewares.before  && this._middleware.before(middlewares.before);
    middlewares.success && this._middleware.success(middlewares.success);
    middlewares.error   && this._middleware.error(middlewares.error);
    middlewares.after   && this._middleware.after(middlewares.after);
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

  request(config = {}) {
    config.method || (config.method = 'get');
    const mergedConfig = this._config.mergeWithDefaults(config);
    const url          = query.buildQuery(format(this._baseUrl, config.url), config.params);

    return this._fetch(url, mergedConfig);
  }

  _fetch(url, config) {
    let runAfter = true;

    return this._middleware.resolveBefore(config)
    .then(config => fetch(url, config))
    .then(res => responseHandler(res, config.bodyType))
    .then(res => this._middleware.resolveSuccess(res))
    .then((res) => {
      runAfter = false;
      return this._middleware.resolveAfter(null, res);
    })
    .catch((err) => {
      this._middleware.resolveError(err);
      return runAfter ? this._middleware.resolveAfter(err) : Promise.reject(err);
    });
  }

  _initMethodsWithNoBody() {
    ['get', 'delete', 'head'].forEach((method) => {
      this[method] = (path, config = {}) => {
        const mergedConfig = this._config.mergeWithDefaults(config, { method });
        const url          = query.buildQuery(format(this._baseUrl, path), config.params);

        return this._fetch(url, mergedConfig);
      };
    });
  }

  _initMethodsWithBody() {
    ['post', 'put', 'patch'].forEach((method) => {
      this[method] = (path, body, config) => {
        const mergedConfig = this._config.mergeWithDefaults(config, { body, method });
        const url          = format(this._baseUrl, path);

        return this._fetch(url, mergedConfig);
      };
    });
  }

}

export default new Trae();
