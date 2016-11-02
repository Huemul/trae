/* global describe it expect afterEach */

const fetchMock = require('fetch-mock');
const trae = require('../src');

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/foo';

describe('HTTP -> http', () => {

  it('extends from EventEmitter class so it should have the "emit" and "on" methods available', () => {
    expect(trae.emit).toBeTruthy();
    expect(trae.on).toBeTruthy();
  });

  describe('init', () => {
    it('Initilize default attributes', () => {
      const baseUrl = 'http://localhost:8080';

      trae.init({ middlewares: [() => {}], baseUrl });

      expect(trae._middlewares.length).toBe(1);
      expect(trae._baseUrl).toBe(baseUrl);
    });
  });

  describe('get', () => {
    it('makes a GET request to baseURL + path', () => {
      fetchMock.mock(TEST_URL, {
        status: 200,
        body  : { foo: 'bar' }
      });

      return trae.get('/foo')
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(TEST_URL)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(TEST_URL);
        expect(fetchMock.lastOptions().method).toBe('GET');
      });
    });
  });

  describe('post', () => {
    it('makes a POST request to baseURL + path', () => {
      fetchMock.mock(TEST_URL, {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'POST'
      });

      return trae.post('/foo')
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(TEST_URL)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(TEST_URL);
        expect(fetchMock.lastOptions().method).toBe('POST');
      });
    });
  });

  describe('put', () => {
    it('makes a PUT request to baseURL + path', () => {
      fetchMock.mock(TEST_URL, {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'PUT'
      });

      return trae.put('/foo')
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(TEST_URL)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(TEST_URL);
        expect(fetchMock.lastOptions().method).toBe('PUT');
      });
    });
  });

  describe('del', () => {
    it('makes a DELETE request to baseURL + path', () => {
      fetchMock.mock(TEST_URL, {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'DELETE'
      });

      return trae.del('/foo')
      .then((res) => {
        expect(res).toEqual({ foo: 'bar' });
        expect(fetchMock.called(TEST_URL)).toBeTruthy();
        expect(fetchMock.lastUrl()).toBe(TEST_URL);
        expect(fetchMock.lastOptions().method).toBe('DELETE');
      });
    });
  });

  describe('_runMiddlewares', () => {
    it('runs provided middlewares', () => {
      const config     = { headers: { foo: 'foo' } };
      const newConfig  = { headers: { foo: 'bar' } };
      const middleware = (config) => { config.headers.foo = 'bar'; };

      trae._middlewares.push(middleware);

      expect(trae._runMiddlewares(config)).toEqual(newConfig);
    });
  });
});
