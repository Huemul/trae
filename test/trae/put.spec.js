/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae      from '../../lib';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe('trae -> put', () => {
  it('makes a PUT request to baseURL + path', () => {
    const url = `${TEST_URL}/foo`;

    fetchMock.mock(url, {
      status : 200,
      body   : {
        foo: 'bar'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }, {
      method: 'put'
    });

    return trae.put(url, { foo: 'bar' })
    .then((res) => {
      expect(res).toMatchSnapshot();
      expect(fetchMock.called(url)).toBeTruthy();
      expect(fetchMock.lastUrl()).toBe(url);
      expect(fetchMock.lastOptions().method).toBe('put');
    });
  });
});
