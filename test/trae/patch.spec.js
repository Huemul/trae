/* global describe it expect afterEach */

import fetchMock from 'fetch-mock'
import trae from '../../lib'

afterEach(() => {
  fetchMock.restore()
})

const TEST_URL = 'http://localhost:8080/api'

describe('trae -> patch', () => {
  it('makes a PATCH request to baseURL + path', () => {
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

    const testTrae = trae.create()

    testTrae.before((c) => {
      expect(c.headers).toMatchSnapshot()
      return c
    })

    return testTrae.patch(url, { foo: 'bar' }).then((res) => {
      expect(res).toMatchSnapshot()
      expect(fetchMock.called(url)).toBeTruthy()
      expect(fetchMock.lastUrl()).toBe(url)
      expect(fetchMock.lastOptions().method).toBe('PATCH')
    })
  })
})
