import { merge, skip } from './utils';


export default class Config {
  constructor(config = {}) {
    this._defaults = { headers: {} };
    this._config   = {};

    this.set(config);
  }

  mergeWithDefaults(...configParams) {
    const params = merge(...configParams);

    const config = merge(
      this._defaults, 
      this.skipNotUsedMethods(params.method),
      this._config[params.method], 
      params
    );

    if (
      typeof config.body === 'object' &&
      config.headers &&
      config.headers['Content-Type'] === 'application/json'
    ) {
      config.body = JSON.stringify(config.body);
    }
    return config;
  }
  
  skipNotUsedMethods(currentMethod){
    const notUsedMethods = [ 'delete', 'get', 'head', 'patch', 'post', 'put' ] 
      .filter(method => currentMethod !== method.toLowerCase());
    return skip(this._config, notUsedMethods);
  }

  
  set(config) {
    this._config = merge(this._config, config);
  }

  get() {
    return merge(this._defaults, this._config);
  }
}
