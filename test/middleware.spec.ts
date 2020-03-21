// @ts-nocheck
/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae from '../src';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe.skip('trae - middleware', () => {
  it('sets the middlewares', () => {
    const apiFoo = trae.create();
    const identity = (response) => response;
    const rejection = (err) => Promise.reject(err);
    const noop = () => {};

    apiFoo.before(identity);
    apiFoo.after(identity, rejection);
    apiFoo.finally(noop);

    expect(apiFoo._middleware._before[0]).toBe(identity);
    expect(apiFoo._middleware._finally[0]).toBe(noop);
    expect(apiFoo._middleware._after[0]).toEqual({
      fulfill: identity,
      reject: rejection,
    });
  });

  describe('before', () => {
    it('runs the before middlewares', () => {
      const apiFoo = trae.create();
      const url = `${TEST_URL}/foo`;
      let configRunned = false;

      fetchMock.mock(url, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          foo: 'bar',
        },
      });

      apiFoo.before((config) => {
        config.headers.Authorization = '12345Foo';
        configRunned = true;
        return config;
      });

      return apiFoo.get(url).then((res) => {
        expect(configRunned).toBe(true);
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('GET');
        expect(fetchMock.lastOptions().headers.Authorization).toBe('12345Foo');
      });
    });
  });

  describe('after', () => {
    it('runs the fulfill after middlewares', () => {
      const apiFoo = trae.create();
      const url = `${TEST_URL}/foo`;
      let afterRunned = false;

      fetchMock.mock(url, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          foo: 'bar',
        },
      });

      apiFoo.after((res) => {
        res.data.test = true;
        afterRunned = true;
        return res;
      });

      return apiFoo.get(url).then((res) => {
        expect(res.data.test).toBe(true);
        expect(afterRunned).toBe(true);
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('GET');
      });
    });

    it('runs the reject after middlewares', () => {
      const apiFoo = trae.create();
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status: 500,
        body: { message: 'Error in the server' },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const fulfill = (res) => Promise.resolve(res);

      const reject = (err) => {
        err.test = true;
        return Promise.reject(err);
      };

      apiFoo.after(fulfill, reject);

      return apiFoo.get(url).catch((err) => {
        expect(err.status).toBe(500);
        expect(err.test).toBe(true);
        expect(err.data).toEqual({ message: 'Error in the server' });
        expect(err).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('GET');
      });
    });
  });

  describe('finally', () => {
    it('runs the finally middlewares', () => {
      const apiFoo = trae.create();
      const url = `${TEST_URL}/foo`;
      let finallyRunned = false;
      const mockConfig = {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          foo: 'bar',
        },
      };
      fetchMock.mock(url, mockConfig);

      apiFoo.finally((conf, passedUrl) => {
        expect(conf.mySpecialConfig).toBe('unicorn');
        expect(passedUrl).toBe(url);
        finallyRunned = true;
      });

      return apiFoo.get(url, { mySpecialConfig: 'unicorn' }).then((res) => {
        expect(finallyRunned).toBe(true);
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('GET');
      });
    });
  });
});
