/* global describe it expect */

const fetchMock = require('fetch-mock');
const trae = require('../src');

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
      fetchMock.mock('http://localhost:8080/foo', {
        status: 200,
        body  : { foo: 'bar' }
      });

      trae.get('/foo')
      .then((res) => {
        expect(res).toBe({ foo: 'bar' });
        fetchMock.restore();
      });
    });
  });

  describe('post', () => {
    it('makes a POST request to baseURL + path', () => {
      fetchMock.mock('http://localhost:8080/foo', {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'POST'
      });

      trae.post('/foo')
      .then((res) => {
        expect(res).toBe({ foo: 'bar' });
        fetchMock.restore();
      });
    });
  });

  describe('put', () => {
    it('makes a PUT request to baseURL + path', () => {
      fetchMock.mock('http://localhost:8080/foo', {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'PUT'
      });

      trae.put('/foo')
      .then((res) => {
        expect(res).toBe({ foo: 'bar' });
        fetchMock.restore();
      });
    });
  });

  describe('del', () => {
    it('makes a DEL request to baseURL + path', () => {
      fetchMock.mock('http://localhost:8080/foo', {
        status: 200,
        body  : { foo: 'bar' }
      }, {
        method: 'DELETE'
      });

      trae.del('/foo')
      .then((res) => {
        expect(res).toBe({ foo: 'bar' });
        fetchMock.restore();
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
