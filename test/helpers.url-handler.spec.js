/* globals describe it expect */

import { format, isAbsolute, combine, concatParams } from '../lib/helpers/url-handler';


describe('urlHandler', () => {
  describe('concatParams', () => {
    it('stringify and concats params to the provided URL', () => {
      const url    = 'https://www.foo.com/bar';
      const params =  {
        foo: {
          bar: {
            baz: 'foobarbaz'
          }
        }
      };

      expect(concatParams(url, params)).toEqual('https://www.foo.com/bar?foo%5Bbar%5D%5Bbaz%5D=foobarbaz');
    });
  });

  describe('combine', () => {
    it('creates and return a new URL by combining the specified URLs', () => {
      const url1  = 'https://www.foo.com/';
      const path1 = '/bar';

      const url2  = 'https://www.foo.com';
      const path2 = '/bar';

      const url3  = 'https://www.foo.com/';
      const path3 = 'bar';

      const url4  = 'https://www.foo.com';
      const path4 = 'bar';

      expect(combine(url1, path1)).toEqual('https://www.foo.com/bar');
      expect(combine(url2, path2)).toEqual('https://www.foo.com/bar');
      expect(combine(url3, path3)).toEqual('https://www.foo.com/bar');
      expect(combine(url4, path4)).toEqual('https://www.foo.com/bar');
    });
  });

  describe('isAbsolute', () => {
    it('determines whether the specified URL is absolute', () => {
      const url1  = 'https://www.foo.com/';
      const url2  = 'https://www.foo.com/bar';
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
      const baseUrl     = undefined;
      const relativeURL = 'https://www.foo.com/bar';

      expect(format(baseUrl, relativeURL)).toBe(relativeURL);
    });

    it('returns the relative url if it is an absolute url', () => {
      const baseUrl     = 'https://www.foo.com/baz';
      const relativeURL = 'https://www.foo.com/bar';

      expect(format(baseUrl, relativeURL)).toBe(relativeURL);
    });

    it('returns base and realative url combined', () => {
      const baseUrl     = 'https://www.foo.com/baz/';
      const relativeURL = '/foo';

      expect(format(baseUrl, relativeURL)).toBe('https://www.foo.com/baz/foo');
    });

    it('returns base, realative url and params combined', () => {
      const baseUrl     = 'https://www.foo.com/baz/';
      const relativeURL = '/foo';
      const params      = {
        foo: 'bar'
      };

      expect(format(baseUrl, relativeURL, params)).toBe('https://www.foo.com/baz/foo?foo=bar');
    });
  });
});
