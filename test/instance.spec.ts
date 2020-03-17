// @ts-nocheck
/* global describe it expect */

import trae from '../src';

describe('Trae', function () {
  it('exposes a function to create a Trae instance', () => {
    const actual = Object.keys(trae).sort()
    const expected = ['create', 'get', 'delete', 'head', 'post', 'put', 'patch', 'config'].sort()

    expect(actual).toStrictEqual(expected)
  });

  describe('Trae instance configuration', function () {

    describe('Immutable configuration', function () {
      const instance = trae.create();

      it('shoud expose an immutable configuration', function () {
        expect(function () {
          instance.config.headers = {};
        }).toThrow(/Cannot assign to read only property/);
      });
    });

    describe('Default configuration', function () {
      const instance = trae.create();

      it('should have "Content-Type": "application/json" header', () => {
        const actual = instance.config.headers
        const expected = {
          'Content-Type': 'application/json'
        }

        expect(actual).toStrictEqual(expected);
      });
    });

    describe('Inherit configuration', function () {
      const instance = trae.create({
        url: 'http://localhost',
        headers: {
          'Authorization': 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      it('should have configuration headers', () => {
        const actual = instance.config.headers
        const expected = {
          'Authorization': 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
          'Content-Type': 'application/x-www-form-urlencoded'
        }

        expect(actual).toStrictEqual(expected);
      });

      it('should have http://localhost base url', () => {
        const actual = instance.config.url
        const expected = 'http://localhost'

        expect(actual).toStrictEqual(expected);
      });

      describe('Nested inherit configuration', function () {
        const nested = instance.create({
          url: 'http://api.com',
          headers: {
            'X-Current-City': 'Barcelona'
          }
        });

        it('should have configuration headers', () => {
          const actual = nested.config.headers
          const expected = {
            'Authorization': 'Basic YWxhZGRpbjpvcGVuc2VzYW1l',
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Current-City': 'Barcelona'
          }

          expect(actual).toStrictEqual(expected);
        });

        it('should have http://localhost base url', () => {
          const actual = nested.config.url
          const expected = 'http://api.com'

          expect(actual).toStrictEqual(expected);
        });
      });
    });
  });
});
