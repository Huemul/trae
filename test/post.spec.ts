// @ts-nocheck
/* global describe beforeAll beforeEach afterEach it expect */

import nock from 'nock';
import fetch from 'node-fetch';
import trae from '../src';
import util from './util';
import http from 'http';

global.fetch = fetch;
global.Headers = fetch.Headers;

const TEST_URL = 'http://localhost:8080';

describe('trae -> post', () => {
  describe('Using nock', () => {
    let request;
    let response;
    let responseBody;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .post('/foo', { pizza: 'guerrin' })
        .reply(200, { foo: 'bar' });
    });

    beforeAll(async function executeRequest() {
      response = await trae.post(TEST_URL + '/foo', { pizza: 'guerrin' });
      responseBody = await response.json();
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
      const actual = responseBody;
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

      beforeAll(async function executeRequest() {
        response = await trae.post(
          TEST_URL + '/cats',
          {},
          { params: { name: 'tigrin' } },
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

  describe('Using http server', () => {
    let server;
    let response: http.Response;
    let responseBody;

    beforeAll(function createServer() {
      function handler(req: http.IncomingMessage, res: http.ServerResponse) {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(req.body));
      }

      server = util.createServer({
        port: 8085,
        endpoint: '/cities/echo',
        handler,
      });
    });

    beforeAll(async function executeRequest() {
      response = await trae.post('http://localhost:8085/cities/echo', {
        city: 'istanbul',
      });
      responseBody = await response.json();
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP post request', function() {
      expect(response).toBeDefined();
    });

    it('should have the defined response data', function() {
      const actual = responseBody;
      const expected = { city: 'istanbul' };

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
