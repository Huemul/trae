/* global describe it expect */
const merge = require('../lib/utils').merge;

const Config = require('../lib/config');

const DEFAULT_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'Content-Type': 'application/json'
};

const DEFAULT_CONFIG = {
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

const defaults = merge(DEFAULT_CONFIG, { headers: DEFAULT_HEADERS });

const configParams = {
  mode: 'no-cors',
  credentials: 'same-origin'
};

function getConfigWithParams() {
  return new Config(configParams);
}

describe('Config -> config', () => {
  it('initializes with the default fetch config', () => {
    const config = new Config();

    expect(config._config).toEqual({});
    expect(config._defaults).toEqual(defaults);
    expect(config.get()).toEqual(defaults);
  });

  it('initializes with the defaults merged with the provided config', () => {
    const config = getConfigWithParams();

    expect(config._config).toEqual(configParams);
    expect(config._defaults).toEqual(defaults);
    expect(config.get()).toEqual(merge(defaults, configParams));
  });

  describe('set', () => {

    it('merges the provided config with this._config', () => {
      const config = getConfigWithParams();
      config.set({
        mode: 'cors',
        headers: {
          'X-ACCESS-TOKE': 'aasdljhf2kjrasdf2l3jrhn2'
        }
      });

      expect(config._config).toEqual({
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'X-ACCESS-TOKE': 'aasdljhf2kjrasdf2l3jrhn2'
        }
      });
    });

  });

  describe('get', () => {

    it('returns the merged _defaults and _config', () => {
      const config = getConfigWithParams();
      config.set({
        mode: 'cors',
        headers: {
          'X-ACCESS-TOKE': 'aasdljhf2kjrasdf2l3jrhn2'
        }
      });

      expect(config.get()).toEqual({
        mode: 'cors',
        credentials: 'same-origin',
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          'X-ACCESS-TOKE': 'aasdljhf2kjrasdf2l3jrhn2',
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      });
    });

  });

  describe('mergeWithDefaults', () => {

    it('returns body stringified according to Content-Type', () => {
      const config = new Config();

      const actual = config.mergeWithDefaults({ body: { foo: 'bar' } });
      expect(actual).toEqual({
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        body: '{"foo":"bar"}'
      });
    });

    it('returns the config merged with the params', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults({ credentials: 'same-origin' });
      expect(actual).toEqual({
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        mode: 'no-cors',
        credentials: 'same-origin'
      });
    });

    it('returns the config merged with the params', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults({ credentials: 'same-origin' });
      expect(actual).toEqual({
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        mode: 'no-cors',
        credentials: 'same-origin'
      });
    });

    it('merges all the params passed', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults(
        { credentials: 'same-origin' },
        { headers: { 'Content-Type': 'text/plain' } }
      );
      expect(actual).toEqual({
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'text/plain'
        },
        mode: 'no-cors',
        credentials: 'same-origin'
      });
    });

    it('does not mutate _config or _defaults', () => {
      const config = new Config({ mode: 'no-cors' });

      const defaults = {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        },
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN'
      };

      expect(config._config).toEqual({ mode: 'no-cors' });
      expect(config._defaults).toEqual(defaults);

      const actual = config.mergeWithDefaults(
        { headers: { 'Content-Type': 'text/plain' } },
        { mode: 'cors' }
      );
      expect(actual).toEqual({
        xsrfCookieName: 'XSRF-TOKEN',
        xsrfHeaderName: 'X-XSRF-TOKEN',
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'text/plain'
        },
        mode: 'cors'
      });

      expect(config._config).toEqual({ mode: 'no-cors' });
      expect(config._defaults).toEqual(defaults);
    });

  });

});
