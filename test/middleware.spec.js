/* global describe it expect */

import createMiddleware from '../src/middleware';


describe('Middleware -> middleware', () => {
  const middleware = createMiddleware();

  it.only('initialize before, after and finally middlewares attributes', () => {
    expect(middleware.before).toEqual([]);
    expect(middleware.after).toEqual([]);
  });

  describe('before', () => {
    it('adds the middleware to _before and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.before(() => {});

      expect(middleware._before.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('after', () => {
    it('adds the middleware to _after and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.after(() => {}, () => {});

      expect(middleware._after.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('finally', () => {
    it('adds the middleware to _finally and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.finally(() => {});

      expect(middleware._finally.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });


  describe('resolveBefore', () => {
    it('apply changes to config attribute chaining _before functions', () => {
      const middleware = new Middleware();
      const config     = { test: true };

      middleware.before((config) => {
        config.foo  = 'bar';
        return config;
      });

      return middleware.resolveBefore(config)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });

    it('apply changes to config attribute chaining _before functions in ascending order', () => {
      const middleware = new Middleware();
      const config     = {};

      middleware.before((config) => {
        config.order = 0;
        return config;
      });

      middleware.before((config) => {
        config.order = 1;
        return config;
      });

      middleware.before((config) => {
        config.order = 2;
        return config;
      });

      return middleware.resolveBefore(config)
      .then((res) => {
        expect(res).toEqual({
          order: 2
        });
      });
    });

    it('apply changes to config attribute chaining _before functions mergin data', () => {
      const middleware = new Middleware();
      const config     = {};

      middleware.before((config) => {
        config.data1 = 'data1';
        return config;
      });

      middleware.before((config) => {
        config.data2 = 'data2';
        return config;
      });

      middleware.before((config) => {
        config.data3 = 'data3';
        return config;
      });

      return middleware.resolveBefore(config)
      .then((res) => {
        expect(res).toEqual({
          data1: 'data1',
          data2: 'data2',
          data3: 'data3'
        });
      });
    });
  });

  describe('resolveAfter', () => {
    it('apply changes to response chaining _after functions (fulfill)', () => {
      const middleware = new Middleware();
      const res        = { test: true };

      middleware.after((res) => {
        res.foo = 'bar';
        return res;
      });

      return middleware.resolveAfter(undefined, res)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });

    it('apply changes to response chaining _after functions (reject)', () => {
      const middleware = new Middleware();
      const err        = new Error('fooTestError');

      middleware.after(undefined, (err) => {
        err.foo = 'bar';
        return err;
      });

      return middleware.resolveAfter(err)
      .catch((err) => {
        expect(err.message).toBe('fooTestError');
        expect(err.foo).toBe('bar');
      });
    });
  });
});
