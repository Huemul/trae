// @ts-nocheck
/* globals describe it expect */

import { format, isAbsolute, combine, concatParams } from '../src/url';

describe('URL Handler', () => {
  describe('concatParams', () => {
    it('stringify and concats params to the provided URL', () => {
      const url = 'https://www.foo.com/bar';
      const params = { bar: 'bar', foo: 'foo' };
      const actual = concatParams(url, params);
      const expectted = 'https://www.foo.com/bar?bar=bar&foo=foo';
      const url = 'https://www.foo.com/bar';

      expect(actual).toBe(expectted);
    });

    it('when params are an empty object it returns the same url', () => {
      const url = 'https://www.foo.com/bar';
      const params = {};
      const actual = concatParams(url, {});

      expect(actual).toBe(url);
    });
  });

  describe('combine', () => {
    it('creates and return a new URL by combining the specified URLs', () => {
      const url1 = 'https://www.foo.com/';
      const path1 = '/bar';

      const url2 = 'https://www.foo.com';
      const path2 = '/bar';

      const url3 = 'https://www.foo.com/';
      const path3 = 'bar';

      const url4 = 'https://www.foo.com';
      const path4 = 'bar';

      expect(combine(url1, path1)).toEqual('https://www.foo.com/bar');
      expect(combine(url2, path2)).toEqual('https://www.foo.com/bar');
      expect(combine(url3, path3)).toEqual('https://www.foo.com/bar');
      expect(combine(url4, path4)).toEqual('https://www.foo.com/bar');
    });
  });

  describe('isAbsolute', () => {
    it('determines whether the specified URL is absolute', () => {
      const url1 = 'https://www.foo.com/';
      const url2 = 'https://www.foo.com/bar';
      const path1 = '/bar';
      const path2 = 'bar';

      expect(isAbsolute(url1)).toBeTruthy();
      expect(isAbsolute(url2)).toBeTruthy();
      expect(isAbsolute(path1)).toBeFalsy();
      expect(isAbsolute(path2)).toBeFalsy();
    });
  });

  describe('format', () => {
    it('returns the relative url if base url argument is not defined', () => {
      const baseUrl = undefined;
      const relativeURL = 'https://www.foo.com/bar';
      const actual = format(baseUrl, relativeURL);
      const expected = relativeURL;

      expect(actual).toBe(expected);
    });

    it('returns the relative url if it is an absolute url', () => {
      const baseUrl = 'https://www.foo.com/baz';
      const relativeURL = 'https://www.foo.com/bar';

      const actual = format(baseUrl, relativeURL);
      const expected = relativeURL;

      expect(actual).toBe(expected);
    });

    it('returns base and realative url combined', () => {
      const baseUrl = 'https://www.foo.com/baz/';
      const relativeURL = '/foo';
      const actual = format(baseUrl, relativeURL);
      const expected = 'https://www.foo.com/baz/foo';

      expect(actual).toBe(expected);
    });

    it('returns base, realative url and params combined', () => {
      const baseUrl = 'https://www.foo.com/baz/';
      const relativeURL = '/foo';
      const params = {
        foo: 'bar',
      };
      const actual = format(baseUrl, relativeURL, params);
      const expected = 'https://www.foo.com/baz/foo?foo=bar';

      expect(actual).toBe(expected);
    });
  });
});
