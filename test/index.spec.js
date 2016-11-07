/* global describe it expect afterEach */

const fetchMock = require('fetch-mock');
const Trae      = require('../lib').Trae;

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/foo';

describe('HTTP -> http', () => {
  it('Initilize default attributes on the constructor', () => {
    const trae = new Trae('/api');

    expect(trae._baseUrl).toEqual('/api');
    expect(trae._middleware).toBeDefined();
  });

  describe('get', () => {
    it('makes a GET request to baseURL + path', () => {
      const trae = new Trae();
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
      const trae = new Trae();
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
      const trae = new Trae();
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
      const trae = new Trae();
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
      const trae = new Trae();
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
      const trae = new Trae();
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
