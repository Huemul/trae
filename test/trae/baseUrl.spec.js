/* global describe it expect */

import trae from '../../lib';

describe('trae - baseUrl', () => {
  it('sets the baseUrl or returns if no params are passed', () => {
    const apiFoo = trae.create();

    expect(apiFoo._baseUrl).toEqual('');

    apiFoo.baseUrl('/api/foo');

    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo.baseUrl()).toBe('/api/foo');
  });
});
