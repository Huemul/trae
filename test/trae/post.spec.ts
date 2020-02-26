// @ts-nocheck
/* global describe beforeAll beforeEach afterEach it expect */

import nock from 'nock';
import fetch from 'node-fetch';
import trae from '../../src';

global.Headers = fetch.Headers;

const TEST_URL = 'http://localhost:8080';

describe('trae -> post', () => {
  beforeAll(function() {
    global.fetch = fetch;
  });

  let request;
  let response;

  beforeAll(function createNock() {
    request = nock(TEST_URL, {
      reqheaders: {
        'content-type': 'application/json',
      },
    })
      .post('/foo', { pizza: 'guerrin' })
      .reply(200, { foo: 'bar' });
  });

  beforeAll(function executeRequest() {
    return trae
      .post(TEST_URL + '/foo', { pizza: 'guerrin' })
      .then(function(res) {
        response = res;
      });
  });

  it('should make an HTTP post request', function() {
    const actual = request.isDone();
    const expected = true;

    expect(actual).toStrictEqual(expected);
  });

  it('should have 200 in the response status code', function() {
    const actual = response.status;
    const expected = 200;

    expect(actual).toStrictEqual(expected);
  });

  it('should have "OK" in the response status text', function() {
    const actual = response.statusText;
    const expected = 'OK';

    expect(actual).toStrictEqual(expected);
  });

  it('should have foo bar in the response data', function() {
    const actual = response.data;
    const expected = { foo: 'bar' };

    expect(actual).toStrictEqual(expected);
  });

  describe('post using params', function() {
    let request;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .post('/cats?name=tigrin')
        .reply(200, { yay: 'OK' });
    });

    beforeAll(function executeRequest() {
      return trae.post(TEST_URL + '/cats', {}, { params: { name: 'tigrin' } });
    });

    it('should make an HTTP post request', function() {
      const actual = request.isDone();
      const expected = true;

      expect(actual).toStrictEqual(expected);
    });

    it('should have 200 in the response status code', function() {
      const actual = response.status;
      const expected = 200;

      expect(actual).toStrictEqual(expected);
    });

    it('should have "OK" in the response status text', function() {
      const actual = response.statusText;
      const expected = 'OK';

      expect(actual).toStrictEqual(expected);
    });
  });

  describe('post using nested params', function() {
    let request;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .post('/foo?a%5Bb%5D=c')
        // TODO: Apparently we do not support empty responses yet. Wen we do
        //       let's remove the unused response object.
        .reply(200, { yay: 'OK' });
    });

    beforeAll(function executeRequest() {
      return trae.post(
        TEST_URL + '/foo',
        {},
        {
          params: {
            a: {
              b: 'c',
            },
          },
        },
      );
    });

    it('should make an HTTP post request', function() {
      const actual = request.isDone();
      const expected = true;

      expect(actual).toStrictEqual(expected);
    });

    it('should have 200 in the response status code', function() {
      const actual = response.status;
      const expected = 200;

      expect(actual).toStrictEqual(expected);
    });

    it('should have "OK" in the response status text', function() {
      const actual = response.statusText;
      const expected = 'OK';

      expect(actual).toStrictEqual(expected);
    });
  });
});
