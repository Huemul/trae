/* global describe it expect */

import trae from '../../lib';

describe('trae -> defaults', () => {
  it('returns the current default config when no params are passed', () => {
    expect(trae.defaults()).toMatchSnapshot();
  });

  it('sets the default config to be used on all requests for the instance', () => {
    trae.defaults({ mode: 'no-cors', credentials: 'same-origin' });
    expect(trae.defaults()).toMatchSnapshot();
  });

  it('adds the baseUrl to trae._baseUrl but does not add it to the defaults', () => {
    const apiFoo = trae.create();
    apiFoo.defaults({ baseUrl: '/api/foo' });
    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo._config.get().baseUrl).not.toBeDefined();
  });

  it('adds the baseUrl to trae._baseUrl and add it to the default response', () => {
    const apiFoo = trae.create();
    apiFoo.defaults({ baseUrl: '/api/foo' });
    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo.defaults().baseUrl).toBeDefined();
  });
});
