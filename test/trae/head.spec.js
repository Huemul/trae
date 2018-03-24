/* global describe it expect afterEach */

import fetchMock from 'fetch-mock';
import trae      from '../../lib';

afterEach(() => {
  fetchMock.restore();
});

const TEST_URL = 'http://localhost:8080/api';

describe('trae -> head', () => {
  it.skip('makes a HEAD request to baseURL + path', () => {
    const url = `${TEST_URL}/foo`;

    fetchMock.mock(url, {
      status: 200
    }, {
      method: 'head'
    });

    const testTrae = trae.create();

    testTrae.before((c) => {
      expect(c.headers).toEqual({});
      return c;
    });


    return testTrae.head(url)
    .then((res) => {
      expect(res).toMatchSnapshot();
      expect(fetchMock.called(url)).toBeTruthy();
      expect(fetchMock.lastUrl()).toBe(url);
      expect(fetchMock.lastOptions().method).toBe('HEAD');
    });
  });
});
