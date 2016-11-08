/* globals describe it expect */
const utils = require('../lib/utils');

describe('utils', () => {
  describe('skip', () => {
    it('returns an object without the properties to skip', () => {
      const obj = {
        foo: 'bar',
        baz: [1, 2, 3],
        nested: {
          foo: 'bar'
        }
      };
      const expected = {
        baz: [1, 2, 3],
        nested: {
          foo: 'bar'
        }
      };
      const actual = utils.skip(obj, ['foo']);
      expect(actual).toEqual(expected);
    });

    it('returns the same object if the keys are not on the object', () => {
      const obj = {
        foo: 'bar'
      };

      const actual = utils.skip(obj, ['baz']);
      expect(actual).toEqual(obj);
    });
  });
});
