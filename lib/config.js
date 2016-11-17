const merge = require('./utils').merge;

const DEFAULT_HEADERS = {
  'Accept'      : 'application/json, text/plain, */*', // eslint-disable-line quote-props
  'Content-Type': 'application/json'
};

const DEFAULT_CONFIG = {
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

class Config {
  constructor(config = {}) {
    this._defaults = merge(DEFAULT_CONFIG, { headers: DEFAULT_HEADERS });
    this._config   = {};

    this.set(config);
  }

  mergeWithDefaults(...configParams) {
    const config = merge(this._defaults, this._config, ...configParams);
    if (
      typeof config.body === 'object' &&
      config.headers &&
      config.headers['Content-Type'] === 'application/json'
    ) {
      config.body = JSON.stringify(config.body);
    }
    return config;
  }

  set(config) {
    this._config = merge(this._config, config);
  }

  get() {
    return merge(this._defaults, this._config);
  }
}

module.exports = Config;
