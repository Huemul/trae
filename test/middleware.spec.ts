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
    const noop = () => {};

    apiFoo.before(identity);

    expect(apiFoo._middleware._before[0]).toBe(identity);
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
});
