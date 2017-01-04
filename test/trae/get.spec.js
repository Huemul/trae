/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae      from '../../lib';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe('trae -> get', () => {
  it('makes a GET request to baseURL + path', () => {
    const url = `${TEST_URL}/foo`;

    fetchMock.mock(url, {
      status : 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        foo: 'bar'
      }
    });

    return trae.get(url)
    .then((res) => {
      expect(res).toMatchSnapshot();
      expect(fetchMock.called(url)).toBeTruthy();
      expect(fetchMock.lastUrl()).toBe(url);
      expect(fetchMock.lastOptions().method).toBe('get');
    });
  });

  it('makes a GET request with raw bodyType and get the body without being parsed', () => {
    const url = `${TEST_URL}/foo`;

    fetchMock.mock(url, {
      status : 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        foo: 'bar'
      }
    });

    return trae.get(url, { bodyType: 'raw' })
    .then((res) => {
      expect(res).toMatchSnapshot();
      expect(fetchMock.called(url)).toBeTruthy();
      expect(fetchMock.lastUrl()).toBe(url);
      expect(fetchMock.lastOptions().method).toBe('get');
    });
  });

  describe('get -> params', () => {

    afterEach(() => {
      fetchMock.restore();
    });

    it('makes a GET request to baseURL + path using params', () => {
      const url = `${TEST_URL}/foo`;
      const qs  = '?foo=bar&key=123&token=12345lkjhpor837';

      fetchMock.mock(url + qs, {
        status : 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          foo: 'bar'
        }
      });

      return trae.get(url, { params: {
        foo  : 'bar',
        key  : 123,
        token: '12345lkjhpor837'
      } })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url + qs)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url + qs);
        expect(fetchMock.lastOptions().method).toBe('get');
      });
    });

    it('makes a GET request to baseURL + path using a nested object as params', () => {
      const url = `${TEST_URL}/foo`;
      const qs  = '?a%5Bb%5D=c';

      fetchMock.mock(url + qs, {
        status : 200,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          foo: 'bar'
        }
      });

      return trae.get(url, { params: {
        a: {
          b: 'c'
        }
      } })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url + qs)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url + qs);
        expect(fetchMock.lastOptions().method).toBe('get');
      });
    });
  });
});
