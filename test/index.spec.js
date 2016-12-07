/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae      from '../lib';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe('trae', () => {
  it('exposed as a singleton instance of Trae class with the default config', () => {
    expect(trae._baseUrl).toEqual('');
    expect(trae._middleware).toBeDefined();
  });

  describe('create', () => {
    it('returns a new instance of Trae with the provided config as defaults', () => {
      const apiFoo = trae.create({ baseUrl: '/api/foo' });
      expect(apiFoo._baseUrl).toBe('/api/foo');
      expect(apiFoo._middleware).toBeDefined();
    });
  });

  describe('baseUrl', () => {
    it('sets the baseUrl or returns if no params are passed', () => {
      const apiFoo = trae.create();

      expect(apiFoo._baseUrl).toEqual('');

      apiFoo.baseUrl('/api/foo');

      expect(apiFoo._baseUrl).toBe('/api/foo');
      expect(apiFoo.baseUrl()).toBe('/api/foo');
    });
  });

  describe('defaults', () => {

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

  describe('use', () => {
    it('sets the middlewares', () => {
      function before(config) { return Promise.resolve(config); }
      function success(res) { return Promise.resolve(res); }
      function error(err) { }
      function after(res) { return Promise.resolve(res); }

      const apiFoo = trae.create();
      apiFoo.use({
        before,
        success,
        error,
        after
      });

      expect(apiFoo._middleware._before[0]).toBe(before);
      expect(apiFoo._middleware._success[0]).toBe(success);
      expect(apiFoo._middleware._error[0]).toBe(error);
      expect(apiFoo._middleware._after[0]).toBe(after);
    });
  });

});

describe('HTTP -> http', () => {
  describe('get', () => {
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
  });

  describe('del', () => {
    it('makes a DELETE request to baseURL + path', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : 'Deleted!',
        headers: {
          'Content-Type': 'application/text'
        }
      }, {
        method: 'delete'
      });

      return trae.delete(url)
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('delete');
      });
    });
  });

  describe('head', () => {
    it('makes a HEAD request to baseURL + path', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status: 200
      }, {
        method: 'head'
      });

      return trae.head(url)
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('head');
      });
    });
  });

  describe('post', () => {
    it('makes a POST request to baseURL + path', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'post'
      });

      return trae.post(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('post');
      });
    });
  });

  describe('put', () => {
    it('makes a PUT request to baseURL + path', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'put'
      });

      return trae.put(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('put');
      });
    });
  });

  describe('patch', () => {
    it('makes a PATCH request to baseURL + path', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'patch'
      });

      return trae.patch(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('patch');
      });
    });
  });

  describe('request', () => {

    afterEach(() => {
      fetchMock.restore();
    });

    it('makes a GET request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(`${url}?foo=sar&bar=test`, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'get'
      });

      return trae.request({
        url,
        method: 'get',
        params: {
          foo: 'sar',
          bar: 'test'
        }
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(`${url}?foo=sar&bar=test`)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(`${url}?foo=sar&bar=test`);
        expect(fetchMock.lastOptions().method).toBe('get');
      });
    });

    it('makes a POST request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'post'
      });

      return trae.request({
        url,
        method: 'post',
        body  : {
          foo: 'baz'
        }
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('post');
      });
    });

    it('makes a PUT request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'put'
      });

      return trae.request({
        url,
        method: 'put',
        body  : {
          foo: 'bar'
        }
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('put');
      });
    });

    it('makes a PATCH request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'patch'
      });

      return trae.request({
        url,
        method: 'patch',
        body  : {
          foo: 'bar'
        }
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('patch');
      });
    });

    it('makes a DELETE request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'delete'
      });

      return trae.request({
        url,
        method: 'delete',
        body  : {
          baz: 'foo'
        }
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('delete');
      });
    });

    it('makes a HEAD request to baseURL + path using the request method', () => {
      const url = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : {
          foo: 'bar'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'head'
      });

      return trae.request({
        url,
        method: 'head'
      })
      .then((res) => {
        expect(res).toMatchSnapshot();
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('head');
      });
    });
  });

  describe('middlewares', () => {
    it('makes a GET request to baseURL + path using success and after middlewares', () => {
      function after(err, res) {
        res.after = true;
        return Promise.resolve(res);
      }

      function success(res) {
        res.success = true;
        return Promise.resolve(res);
      }

      const url = `${TEST_URL}/foo`;
      fetchMock.mock(url, {
        status: 200
      });

      trae.use({ after, success });

      return trae.get(url)
        .then((res) => {
          expect(res.success).toBe(true);
          expect(res.after).toBe(true);
        });
    });

    it('makes a GET request to baseURL + path using error and after middlewares', () => {
      function after(err) {
        err.after = true;
        return Promise.reject(err);
      }

      function error(err) {
        err.error = true;
      }

      const url = `${TEST_URL}/foo`;
      fetchMock.mock(url, { status: 500 });

      trae.use({ after, error });

      return trae.get(url)
        .catch((err) => {
          expect(err.error).toBe(true);
          expect(err.after).toBe(true);
        });
    });
  });
});
