/* global describe it expect */

import { merge } from '../lib/utils';
import Config    from '../lib/config';


const DEFAULT_HEADERS = {
  Accept        : 'application/json, text/plain, */*',
  'Content-Type': 'application/json'
};

const defaults = merge({}, { headers: DEFAULT_HEADERS });

const configParams = {
  mode       : 'no-cors',
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
          'X-ACCESS-TOKEN': 'aasdljhf2kjrasdf2l3jrhn2'
        }
      });

      expect(config._config).toMatchSnapshot();
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

      expect(config.get()).toMatchSnapshot();
    });

  });

  describe('mergeWithDefaults', () => {

    it('returns body stringified according to Content-Type', () => {
      const config = new Config();

      const actual = config.mergeWithDefaults({ body: { foo: 'bar' } });
      expect(actual).toMatchSnapshot();
    });

    it('returns the config merged with the params', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults({ credentials: 'same-origin' });
      expect(actual).toMatchSnapshot();
    });

    it('returns the config merged with the params', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults({ credentials: 'same-origin' });
      expect(actual).toMatchSnapshot();
    });

    it('merges all the params passed', () => {
      const config = new Config({ mode: 'no-cors' });

      const actual = config.mergeWithDefaults(
        { credentials: 'same-origin' },
        { headers: { 'Content-Type': 'text/plain' } }
      );
      expect(actual).toMatchSnapshot();
    });

    it('does not mutate _config or _defaults', () => {
      const config = new Config({ mode: 'no-cors' });

      expect(config._config).toEqual({ mode: 'no-cors' });
      expect(config._defaults).toEqual(defaults);

      const actual = config.mergeWithDefaults(
        { headers: { 'Content-Type': 'text/plain' } },
        { mode: 'cors' }
      );
      expect(actual).toMatchSnapshot();

      expect(config._config).toEqual({ mode: 'no-cors' });
      expect(config._defaults).toEqual(defaults);
    });

  });

});
