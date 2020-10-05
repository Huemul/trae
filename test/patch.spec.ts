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

describe('trae -> patch', () => {
  const instance = trae.create({ json: true });

  describe('Using nock', () => {
    let request;
    let response;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .patch('/foo', { pizza: 'guerrin' })
        .reply(200, { foo: 'bar' });
    });

    beforeAll(async function executeRequest() {
      response = await instance.patch(TEST_URL + '/foo', { pizza: 'guerrin' });
    });

    it('should make an HTTP patch request', function() {
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

    describe('patch using params', function() {
      let request;

      beforeAll(function createNock() {
        request = nock(TEST_URL)
          .patch('/cats?name=tigrin')
          .reply(200, { yay: 'OK' });
      });

      beforeAll(async function executeRequest() {
        response = await instance.patch(
          TEST_URL + '/cats',
          {},
          { params: { name: 'tigrin' } },
        );
      });

      it('should make an HTTP patch request', function() {
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
        res.writeHead(204);
        res.end();
      }

      server = util.createServer({
        port: 8084,
        endpoint: '/cities/echo',
        handler,
      });
    });

    beforeAll(async function executeRequest() {
      response = await trae.patch(
        'http://localhost:8084/cities/echo',
        JSON.stringify({ city: 'istanbul' }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
      responseBody = await response.text();
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP patch request', function() {
      expect(response).toBeDefined();
    });

    it('should have no data the response', function() {
      const actual = responseBody;
      const expected = '';

      expect(actual).toStrictEqual(expected);
    });

    it('should have 204 in the response status code', function() {
      const actual = response.status;
      const expected = 204;

      expect(actual).toStrictEqual(expected);
    });

    it('should have "No Content" in the response status text', function() {
      const actual = response.statusText;
      const expected = 'No Content';

      expect(actual).toStrictEqual(expected);
    });
  });
});
