import { merge } from './utils';


export default class Config {
  constructor(config = {}) {
    this._defaults = { headers: {} };
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
