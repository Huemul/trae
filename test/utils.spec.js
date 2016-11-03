/* global describe it expect */

const utils = require('../lib/utils');

describe('utils functions', () => {

  describe('buildQuery', () => {
    it('builds a scaped query string for an url', () => {
      let actual = utils.buildQuery({
        foo: 'bar',
        key: 123,
        token: '12345lkjhpor837'
      });
      expect(actual).toBe('?foo=bar&key=123&token=12345lkjhpor837');

      actual = utils.buildQuery({
        foo: 'param with spaces',
        bar: undefined
      });
      expect(actual).toBe('?foo=param%20with%20spaces&bar=');
    });

    it('returns and empty string when no "params" are passed', () => {
      const actual = utils.buildQuery({});
      expect(actual).toBe('');
    });
  });

});
