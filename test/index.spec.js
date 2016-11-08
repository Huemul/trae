/* global describe it expect afterEach */

const fetchMock = require('fetch-mock');
const trae      = require('../lib');

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
      expect(apiFoo.defaults().baseUrl).not.toBeDefined();
    });

  });

  describe('use', () => {
    it('sets the middlewares', () => {
      function req(config) { return Promise.resolve(config); }
      function fulfill(config) { return Promise.resolve(config); }
      function reject(error) { return Promise.reject(error); }

      const apiFoo = trae.create();
      apiFoo.use({ config: req, fulfill, reject });

      expect(apiFoo._middleware._req[0]).toBe(req);
      expect(apiFoo._middleware._res[0].fulfill).toBe(fulfill);
      expect(apiFoo._middleware._res[0].reject).toBe(reject);
    });
  });

});

describe('HTTP -> http', () => {

  describe('response not ok', () => {
    it('gets rejected', () => {
      const url = `${TEST_URL}/foo`;
      fetchMock.mock(url, {
        status: 404
      });

      return trae.get(url)
        .catch((error) => {
          expect(error).toMatchSnapshot();
        });
    });
  });

  describe('get', () => {
    it('makes a GET request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

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
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('get');
      });
    });
  });

  describe('del', () => {
    it('makes a DELETE request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

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
        expect(res).toEqual('Deleted!');
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('delete');
      });
    });
  });

  describe('head', () => {
    it('makes a HEAD request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status: 200
      }, {
        method: 'head'
      });

      return trae.head(url)
      .then((res) => {
        expect(res).toEqual('');
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('head');
      });
    });
  });

  describe('post', () => {
    it('makes a POST request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : { foo: 'bar' },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'post'
      });

      return trae.post(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('post');
      });
    });
  });

  describe('put', () => {
    it('makes a PUT request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : { foo: 'bar' },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'put'
      });

      return trae.put(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('put');
      });
    });
  });

  describe('patch', () => {
    it('makes a PATCH request to baseURL + path', () => {
      const url  = `${TEST_URL}/foo`;

      fetchMock.mock(url, {
        status : 200,
        body   : { foo: 'bar' },
        headers: {
          'Content-Type': 'application/json'
        }
      }, {
        method: 'patch'
      });

      return trae.patch(url, { foo: 'bar' })
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(url)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(url);
        expect(fetchMock.lastOptions().method).toBe('patch');
      });
    });
  });

});
