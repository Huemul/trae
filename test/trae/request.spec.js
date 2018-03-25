/* global describe it expect afterEach */

import fetchMock from 'fetch-mock'
import trae from '../../lib'

afterEach(() => {
  fetchMock.restore()
})

const TEST_URL = 'http://localhost:8080/api'

describe('trae -> request', () => {
  afterEach(() => {
    fetchMock.restore()
  })

  it('makes a GET request to baseURL + path using the request method', () => {
    const url = `${TEST_URL}/foo`

    fetchMock.mock(
      `${url}?foo=sar&bar=test`,
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
        method: 'get',
      },
    )

    return trae
      .request({
        url,
        method: 'get',
        params: {
          foo: 'sar',
          bar: 'test',
        },
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(`${url}?foo=sar&bar=test`)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(`${url}?foo=sar&bar=test`)
        expect(fetchMock.lastOptions().method).toBe('GET')
      })
  })

  it('makes a POST request to baseURL + path using the request method', () => {
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

    return trae
      .request({
        url,
        method: 'post',
        body: {
          foo: 'baz',
        },
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(url)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(url)
        expect(fetchMock.lastOptions().method).toBe('POST')
      })
  })

  it('makes a PUT request to baseURL + path using the request method', () => {
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
        method: 'put',
      },
    )

    return trae
      .request({
        url,
        method: 'put',
        body: {
          foo: 'bar',
        },
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(url)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(url)
        expect(fetchMock.lastOptions().method).toBe('PUT')
      })
  })

  it('makes a PATCH request to baseURL + path using the request method', () => {
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
        method: 'patch',
      },
    )

    return trae
      .request({
        url,
        method: 'patch',
        body: {
          foo: 'bar',
        },
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(url)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(url)
        expect(fetchMock.lastOptions().method).toBe('PATCH')
      })
  })

  it('makes a DELETE request to baseURL + path using the request method', () => {
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
        method: 'delete',
      },
    )

    return trae
      .request({
        url,
        method: 'delete',
        body: {
          baz: 'foo',
        },
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(url)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(url)
        expect(fetchMock.lastOptions().method).toBe('DELETE')
      })
  })

  it('makes a HEAD request to baseURL + path using the request method', () => {
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
        method: 'head',
      },
    )

    return trae
      .request({
        url,
        method: 'head',
      })
      .then((res) => {
        expect(res).toMatchSnapshot()
        expect(fetchMock.called(url)).toBeTruthy()
        expect(fetchMock.lastUrl()).toBe(url)
        expect(fetchMock.lastOptions().method).toBe('HEAD')
      })
  })
})
