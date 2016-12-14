/* global describe it expect */
import trae from '../../lib';


describe('trae - create', () => {
  it('returns a new instance of Trae with the provided config as defaults', () => {
    const apiFoo = trae.create({ baseUrl: '/api/foo' });
    expect(apiFoo._baseUrl).toBe('/api/foo');
    expect(apiFoo._middleware).toBeDefined();
  });
});
