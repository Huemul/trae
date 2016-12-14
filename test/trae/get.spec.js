/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae      from '../../lib';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe('trae -> get', () => {
  it('makes a GET request to baseURL + path', () => {
    const url = `${TEST_URL}/foo`;

    fetchMock.mock(url, {
      status : 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        foo: 'bar'
      }
    });

    return trae.get(url)
    .then((res) => {
      expect(res).toMatchSnapshot();
      expect(fetchMock.called(url)).toBeTruthy();
      expect(fetchMock.lastUrl()).toBe(url);
      expect(fetchMock.lastOptions().method).toBe('get');
    });
  });
});
