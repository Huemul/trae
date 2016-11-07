/* global describe it expect */

const Middleware = require('../lib/middleware');

describe('Middleware -> middleware', () => {
  const middleware = new Middleware();

  it('initialize req and res middlewares attributes', () => {
    expect(middleware._req).toEqual([]);
    expect(middleware._res).toEqual([]);
  });

  describe('request', () => {
    it('adds the middleware to _req and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.request(() => {});

      expect(middleware._req.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('response', () => {
    it('adds the middleware to _res and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.response(() => {});

      expect(middleware._res.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('resolveRequests', () => {
    it('apply changes to config attribute chaining _req functions', () => {
      const middleware = new Middleware();
      const config     = { test: true };

      middleware.request((config) => {
        config.foo  = 'bar';
        return config;
      });

      return middleware.resolveRequests(config)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });

    it('apply changes to config attribute chaining _req functions in ascending order', () => {
      const middleware = new Middleware();
      const config     = {};

      middleware.request((config) => {
        config.order = 0;
        return config;
      });

      middleware.request((config) => {
        config.order = 1;
        return config;
      });

      middleware.request((config) => {
        config.order = 2;
        return config;
      });

      return middleware.resolveRequests(config)
      .then((res) => {
        expect(res).toEqual({
          order: 2
        });
      });
    });

    it('apply changes to config attribute chaining _req functions mergin data', () => {
      const middleware = new Middleware();
      const config     = {};

      middleware.request((config) => {
        config.data1 = 'data1';
        return config;
      });

      middleware.request((config) => {
        config.data2 = 'data2';
        return config;
      });

      middleware.request((config) => {
        config.data3 = 'data3';
        return config;
      });

      return middleware.resolveRequests(config)
      .then((res) => {
        expect(res).toEqual({
          data1: 'data1',
          data2: 'data2',
          data3: 'data3'
        });
      });
    });
  });

  describe('resolveResponses', () => {
    it('apply changes to response chaining _res functions', () => {
      const middleware = new Middleware();
      const response   = { test: true };

      middleware.response((response) => {
        response.foo = 'bar';
        return response;
      });

      return middleware.resolveResponses(response)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });
  });
});
