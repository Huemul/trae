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

describe('trae -> put', () => {
  describe('Using nock', () => {
    let request;
    let response;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .put('/foo', { pizza: 'guerrin' })
        .reply(200, { foo: 'bar' });
    });

    beforeAll(function executeRequest() {
      return trae
        .put(TEST_URL + '/foo', { pizza: 'guerrin' })
        .then(function (res) {
          response = res;
        });
    });

    it('should make an HTTP put request', function () {
      const actual = request.isDone();
      const expected = true;

      expect(actual).toStrictEqual(expected);
    });

    it('should have 200 in the response status code', function () {
      const actual = response.status;
      const expected = 200;

      expect(actual).toStrictEqual(expected);
    });

    it('should have "OK" in the response status text', function () {
      const actual = response.statusText;
      const expected = 'OK';

      expect(actual).toStrictEqual(expected);
    });

    it('should have foo bar in the response data', function () {
      const actual = response.data;
      const expected = { foo: 'bar' };

      expect(actual).toStrictEqual(expected);
    });

    describe('put using params', function () {
      let request;

      beforeAll(function createNock() {
        request = nock(TEST_URL, {
          reqheaders: {
            'content-type': 'application/json',
          },
        })
          .put('/cats?name=tigrin')
          .reply(200, { yay: 'OK' });
      });

      beforeAll(function executeRequest() {
        return trae.put(
          TEST_URL + '/cats',
          {},
          { params: { name: 'tigrin' } },
        );
      });

      it('should make an HTTP put request', function () {
        const actual = request.isDone();
        const expected = true;

        expect(actual).toStrictEqual(expected);
      });

      it('should have 200 in the response status code', function () {
        const actual = response.status;
        const expected = 200;

        expect(actual).toStrictEqual(expected);
      });

      it('should have "OK" in the response status text', function () {
        const actual = response.statusText;
        const expected = 'OK';

        expect(actual).toStrictEqual(expected);
      });
    });

    describe('put using nested params', function () {
      let request;

      beforeAll(function createNock() {
        request = nock(TEST_URL, {
          reqheaders: {
            'content-type': 'application/json',
          },
        })
          .put('/foo?a%5Bb%5D=c')
          .reply(200);
      });

      beforeAll(function executeRequest() {
        return trae.put(
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

      it('should make an HTTP put request', function () {
        const actual = request.isDone();
        const expected = true;

        expect(actual).toStrictEqual(expected);
      });

      it('should have 200 in the response status code', function () {
        const actual = response.status;
        const expected = 200;

        expect(actual).toStrictEqual(expected);
      });

      it('should have "OK" in the response status text', function () {
        const actual = response.statusText;
        const expected = 'OK';

        expect(actual).toStrictEqual(expected);
      });
    });
  });

  describe('Using http server', () => {
    let server;
    let response: http.Response;

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

    beforeAll(function executeRequest() {
      return trae
        .put('http://localhost:8084/cities/echo', {
          city: 'istanbul',
        })
        .then(function (res) {
          response = res;
        });
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP put request', function () {
      expect(response).toBeDefined();
    });

    it('should have no data the response', function () {
      const actual = response.data;
      const expected = ""

      expect(actual).toStrictEqual(expected);
    });

    it('should have 204 in the response status code', function () {
      const actual = response.status;
      const expected = 204;

      expect(actual).toStrictEqual(expected);
    });

    it('should have "No Content" in the response status text', function () {
      const actual = response.statusText;
      const expected = 'No Content';

      expect(actual).toStrictEqual(expected);
    });
  });
});
