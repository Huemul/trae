// @ts-nocheck
/* global describe it expect */

import trae from '../../src';

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
  });
});
