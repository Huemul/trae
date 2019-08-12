/* global describe it expect */

import trae from '../../src';

describe.only('trae', () => {
  it('exposes a singleton instance of Trae', () => {
    expect(trae.get).toBeDefined();
  });

  // it('adds "Content-Type": "application/json" header to the methods with body', () => {
  //   expect(trae.defaults().post).toMatchSnapshot();
  //   expect(trae.defaults().patch).toMatchSnapshot();
  //   expect(trae.defaults().put).toMatchSnapshot();

  //   expect(trae.defaults().head).toBe(undefined);
  //   expect(trae.defaults().get).toBe(undefined);
  //   expect(trae.defaults().delete).toBe(undefined);
  // });
});
