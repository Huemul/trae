/* global describe it expect afterEach */

import fetchMock from 'fetch-mock'
import trae from '../../lib'

afterEach(() => {
  fetchMock.restore()
})

const TEST_URL = 'http://localhost:8080/api'

describe('trae -> post', () => {
  it('makes a POST request to baseURL + path', () => {
    const url = `${TEST_URL}/foo`

    fetchMock.mock(
      url,
      {
        status: 200,
        body: {
          foo: 'bar',
        },
        headers: {
          'Content-Type': 'application/json',
        },
      },
      {
        method: 'post',
      },
    )

    const testTrae = trae.create()

    testTrae.before((c) => {
      expect(c.headers).toMatchSnapshot()
      return c
    })

    return testTrae.post(url, { foo: 'bar' }).then((res) => {
      expect(res).toMatchSnapshot()
      expect(fetchMock.called(url)).toBeTruthy()
      expect(fetchMock.lastUrl()).toBe(url)
      expect(fetchMock.lastOptions().method).toBe('POST')
    })
  })

  describe('post -> params', () => {
    afterEach(() => {
      fetchMock.restore()
    })

    it('makes a POST request to baseURL + path using params', () => {
      const url = `${TEST_URL}/foo`
      const qs = '?foo=bar&key=123&token=12345lkjhpor837'

      fetchMock.mock(
        url + qs,
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            foo: 'bar',
          },
        },
        {
          method: 'post',
        },
      )

      return trae
        .post(
          url,
          {
            sarasa: 'request body',
          },
          {
            params: {
              foo: 'bar',
              key: 123,
              token: '12345lkjhpor837',
            },
          },
        )
        .then((res) => {
          expect(res).toMatchSnapshot()
          expect(fetchMock.called(url + qs)).toBeTruthy()
          expect(fetchMock.lastUrl()).toBe(url + qs)
          expect(fetchMock.lastOptions().method).toBe('POST')
        })
    })

    it('makes a POST request to baseURL + path using a nested object as params', () => {
      const url = `${TEST_URL}/foo`
      const qs = '?a%5Bb%5D=c'

      fetchMock.mock(url + qs, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          foo: 'bar',
        },
      })

      return trae
        .post(
          url,
          {
            sarasa: 'request body',
          },
          {
            params: {
              a: {
                b: 'c',
              },
            },
          },
        )
        .then((res) => {
          expect(res).toMatchSnapshot()
          expect(fetchMock.called(url + qs)).toBeTruthy()
          expect(fetchMock.lastUrl()).toBe(url + qs)
          expect(fetchMock.lastOptions().method).toBe('POST')
        })
    })
  })
})
