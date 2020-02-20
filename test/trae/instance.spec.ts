// @ts-nocheck
/* global describe it expect */

import trae from '../../src';

describe('Trae', function () { 
  it('exposes a function to create a Trae instance', () => {
    const actual = typeof trae
    const expected = 'object'

    expect(actual).toStrictEqual(expected)
  });

  it('should have a create method', function () {
    const actual = typeof trae.create
    const expected = 'function'

    expect(actual).toStrictEqual(expected)
  })

  it('should have a get method', function () {
    const actual = typeof trae.get;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a patch method', function () {
    const actual = typeof trae.get;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a delete method', function () {
    const actual = typeof trae.delete;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a head method', function () {
    const actual = typeof trae.head;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a post method', function () {
    const actual = typeof trae.post;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a put method', function () {
    const actual = typeof trae.put;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  it('should have a patch method', function () {
    const actual = typeof trae.patch;
    const expected = 'function';

    expect(actual).toStrictEqual(expected);
  });

  describe('Trae instance methods', function () {
    const instance = trae.create()

    it('should have a create method', function () {
      const actual = typeof instance.create
      const expected = 'function'

      expect(actual).toStrictEqual(expected)
    })

    it('should have a get method', function() {
      const actual = typeof instance.get;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a patch method', function() {
      const actual = typeof instance.get;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a delete method', function() {
      const actual = typeof instance.delete;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a head method', function() {
      const actual = typeof instance.head;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a post method', function() {
      const actual = typeof instance.post;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a put method', function() {
      const actual = typeof instance.put;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });

    it('should have a patch method', function() {
      const actual = typeof instance.patch;
      const expected = 'function';

      expect(actual).toStrictEqual(expected);
    });
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
