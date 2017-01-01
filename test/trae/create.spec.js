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

  it('provided config values override the inherited ones', () => {
    trae.baseUrl('/api/foo');
    trae.defaults({ mode: 'cache' });
    const apiBar = trae.create({ baseUrl: '/api/bar', mode: 'no-cors' });
    expect(apiBar._baseUrl).toBe('/api/bar');
    expect(apiBar.defaults().mode).toBe('no-cors');
  });

  it('inherits the middlewares', () => {
    const testTrue = (obj) => {
      obj.test = true;
      return obj;
    };
    const testFalse = (obj) => {
      obj.test = false;
      return obj;
    };

    trae.before(testTrue);
    trae.before(testFalse);

    trae.after(testTrue, testTrue);
    trae.after(testFalse, testFalse);

    trae.finally(() => 'gotta make sure of this');
    trae.finally(() => 'add this!!!');

    const apiTest = trae.create();

    expect(apiTest._middleware._before.length).toBe(2);
    expect(apiTest._middleware._before[0]({})).toEqual({ test: true });
    expect(apiTest._middleware._before[1]({})).toEqual({ test: false });

    expect(apiTest._middleware._after.length).toBe(2);
    expect(apiTest._middleware._after[0].fulfill({})).toEqual({ test: true });
    expect(apiTest._middleware._after[0].reject({})).toEqual({ test: true });
    expect(apiTest._middleware._after[1].fulfill({})).toEqual({ test: false });
    expect(apiTest._middleware._after[1].reject({})).toEqual({ test: false });

    expect(apiTest._middleware._finally.length).toBe(2);
    expect(apiTest._middleware._finally[0]({})).toBe('gotta make sure of this');
    expect(apiTest._middleware._finally[1]({})).toBe('add this!!!');
  });
});
