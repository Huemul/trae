/* global describe it expect */

import Middleware from '../lib/middleware'

describe('Middleware -> middleware', () => {
  it('initialize before, after and finally middlewares attributes', () => {
    const middleware = new Middleware()
    expect(middleware._before).toEqual([])
    expect(middleware._after).toEqual([])
    expect(middleware._finally).toEqual([])
  })

  describe('before', () => {
    it('adds the middleware to _before and returns its id (Array position)', () => {
      const middleware = new Middleware()

      const id = middleware.before(() => {})

      expect(middleware._before.length).toEqual(1)
      expect(id).toEqual(0)
    })
  })

  describe('after', () => {
    it('adds the middleware to _after and returns its id (Array position)', () => {
      const middleware = new Middleware()

      const id = middleware.after(() => {}, () => {})

      expect(middleware._after.length).toEqual(1)
      expect(id).toEqual(0)
    })
  })

  describe('finally', () => {
    it('adds the middleware to _finally and returns its id (Array position)', () => {
      const middleware = new Middleware()

      const id = middleware.finally(() => {})

      expect(middleware._finally.length).toEqual(1)
      expect(id).toEqual(0)
    })
  })

  describe('resolveBefore', () => {
    it('apply changes to config attribute chaining _before functions', () => {
      const middleware = new Middleware()
      const config = { test: true }

      middleware.before((c) => {
        c.foo = 'bar'
        return c
      })

      return middleware.resolveBefore(config).then((res) => {
        expect(res).toEqual({
          foo: 'bar',
          test: true,
        })
      })
    })

    it('apply changes to config attribute chaining _before functions in ascending order', () => {
      const middleware = new Middleware()
      const config = {}

      middleware.before((c) => {
        c.order = 0
        return c
      })

      middleware.before((c) => {
        c.order = 1
        return c
      })

      middleware.before((c) => {
        c.order = 2
        return c
      })

      return middleware.resolveBefore(config).then((res) => {
        expect(res).toEqual({
          order: 2,
        })
      })
    })

    it('apply changes to config attribute chaining _before functions mergin data', () => {
      const middleware = new Middleware()
      const config = {}

      middleware.before((c) => {
        c.data1 = 'data1'
        return c
      })

      middleware.before((c) => {
        c.data2 = 'data2'
        return c
      })

      middleware.before((c) => {
        c.data3 = 'data3'
        return c
      })

      return middleware.resolveBefore(config).then((res) => {
        expect(res).toEqual({
          data1: 'data1',
          data2: 'data2',
          data3: 'data3',
        })
      })
    })
  })

  describe('resolveAfter', () => {
    it('apply changes to response chaining _after functions (fulfill)', () => {
      const middleware = new Middleware()
      const res = { test: true }

      middleware.after((r) => {
        r.foo = 'bar'
        return r
      })

      return middleware.resolveAfter(undefined, res).then((r) => {
        expect(r).toEqual({
          foo: 'bar',
          test: true,
        })
      })
    })

    it('apply changes to response chaining _after functions (reject)', () => {
      const middleware = new Middleware()
      const err = new Error('fooTestError')

      middleware.after(undefined, (e) => {
        e.foo = 'bar'
        return e
      })

      return middleware.resolveAfter(err).catch((e) => {
        expect(e.message).toBe('fooTestError')
        expect(e.foo).toBe('bar')
      })
    })
  })
})
