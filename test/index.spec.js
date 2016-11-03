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

  describe('methods with no body', () => {

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
          expect(fetchMock.lastOptions().method).toBe('get');
        });
      });
    });

    describe('del', () => {
      it('makes a DELETE request to baseURL + path', () => {
        fetchMock.mock(TEST_URL, {
          status: 200,
          body  : { foo: 'bar' }
        }, {
          method: 'delete'
        });

        return trae.delete('/foo')
        .then((res) => {
          expect(res).toEqual({ foo: 'bar' });
          expect(fetchMock.called(TEST_URL)).toBeTruthy();
          expect(fetchMock.lastUrl()).toBe(TEST_URL);
          expect(fetchMock.lastOptions().method).toBe('delete');
        });
      });
    });

    describe('head', () => {
      it('makes a HEAD request to baseURL + path', () => {
        fetchMock.mock(TEST_URL, {
          status: 200,
          body  : { foo: 'bar' }
        }, {
          method: 'head'
        });

        return trae.head('/foo')
        .then((res) => {
          expect(res).toEqual({ foo: 'bar' });
          expect(fetchMock.called(TEST_URL)).toBeTruthy();
          expect(fetchMock.lastUrl()).toBe(TEST_URL);
          expect(fetchMock.lastOptions().method).toBe('head');
        });
      });
    });

  });

  describe('methods with body', () => {
    describe('post', () => {
      it('makes a POST request to baseURL + path', () => {
        fetchMock.mock(TEST_URL, {
          status: 200,
          body  : { foo: 'bar' }
        }, {
          method: 'post'
        });

        return trae.post('/foo', { foo: 'bar' })
        .then((res) => {
          expect(res).toEqual({ foo: 'bar' });
          expect(fetchMock.called(TEST_URL)).toBeTruthy();
          expect(fetchMock.lastUrl()).toBe(TEST_URL);
          expect(fetchMock.lastOptions().method).toBe('post');
        });
      });
    });

    describe('put', () => {
      it('makes a PUT request to baseURL + path', () => {
        fetchMock.mock(TEST_URL, {
          status: 200,
          body  : { foo: 'bar' }
        }, {
          method: 'put'
        });

        return trae.put('/foo', { foo: 'bar' })
        .then((res) => {
          expect(res).toEqual({ foo: 'bar' });
          expect(fetchMock.called(TEST_URL)).toBeTruthy();
          expect(fetchMock.lastUrl()).toBe(TEST_URL);
          expect(fetchMock.lastOptions().method).toBe('put');
        });
      });
    });

    describe('patch', () => {
      it('makes a PATCH request to baseURL + path', () => {
        fetchMock.mock(TEST_URL, {
          status: 200,
          body  : { foo: 'bar' }
        }, {
          method: 'patch'
        });

        return trae.patch('/foo', { foo: 'bar' })
        .then((res) => {
          expect(res).toEqual({ foo: 'bar' });
          expect(fetchMock.called(TEST_URL)).toBeTruthy();
          expect(fetchMock.lastUrl()).toBe(TEST_URL);
          expect(fetchMock.lastOptions().method).toBe('patch');
        });
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
