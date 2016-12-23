/* global describe it expect */
import trae from '../../lib';

describe('trae - create', () => {
  it('returns a new instance of Trae with the provided config as defaults', () => {
    const apiFoo = trae.create({ baseUrl: '/api/foo' });
    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo._middleware).toBeDefined();
  });

  it('inherits the defaults from the previous instances', () => {
    trae.baseUrl('/api/foo');
    trae.defaults({ mode: 'no-cors' });
    const apiFoo = trae.create();
    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo.defaults().mode).toBe('no-cors');

    apiFoo.defaults({ bodyType: 'buffer' });
    const apiFoo2 = apiFoo.create();
    expect(apiFoo2._baseUrl).toBe('/api/foo');
    expect(apiFoo2.defaults().mode).toBe('no-cors');
    expect(apiFoo2.defaults().bodyType).toBe('buffer');
  });
});
