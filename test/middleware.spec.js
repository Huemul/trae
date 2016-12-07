/* global describe it expect */

import Middleware from '../lib/middleware';

describe('Middleware -> middleware', () => {
  const middleware = new Middleware();

  it('initialize req and res middlewares attributes', () => {
    expect(middleware._before).toEqual([]);
    expect(middleware._success).toEqual([]);
    expect(middleware._error).toEqual([]);
    expect(middleware._after).toEqual([]);
  });

  describe('before', () => {
    it('adds the middleware to _before and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.before(() => {});

      expect(middleware._before.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('success', () => {
    it('adds the middleware to _success and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.success(() => {});

      expect(middleware._success.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('error', () => {
    it('adds the middleware to _error and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.error(() => {});

      expect(middleware._error.length).toEqual(1);
      expect(id).toEqual(0);
    });
  });

  describe('after', () => {
    it('adds the middleware to _after and returns its id (Array position)', () => {
      const middleware = new Middleware();

      const id = middleware.after(() => {});

      expect(middleware._after.length).toEqual(1);
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

  describe('resolveSuccess', () => {
    it('apply changes to response chaining _success functions', () => {
      const middleware = new Middleware();
      const res   = { test: true };

      middleware.success((res) => {
        res.foo = 'bar';
        return res;
      });

      return middleware.resolveSuccess(res)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });
  });

  describe('resolveError', () => {
    it('apply changes to response chaining _error functions', () => {
      const middleware = new Middleware();
      const err   = { test: true };

      middleware.error((err) => {
        err.foo = 'bar';
        return err;
      });

      return middleware.resolveError(err)
      .catch((err) => {
        expect(err).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });
  });

  describe('resolveAfter', () => {
    it('apply changes to response chaining _after functions after success', () => {
      const middleware = new Middleware();
      const res   = { test: true };

      middleware.after((err, res) => {
        res.foo = 'bar';
        return res;
      });

      return middleware.resolveAfter(null, res)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });

    it('apply changes to response chaining _after functions after error', () => {
      const middleware = new Middleware();
      const err   = { test: true };

      middleware.after((err) => {
        err.foo = 'bar';
        return err;
      });

      return middleware.resolveAfter(err)
      .then((res) => {
        expect(res).toEqual({
          foo : 'bar',
          test: true
        });
      });
    });
  });
});
