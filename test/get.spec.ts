// @ts-nocheck
/* global describe beforeAll beforeEach afterEach it expect */

import url from 'url';
import nock from 'nock';
import fetch from 'node-fetch';
import trae from '../src';
import util from './util';
import http from 'http';

global.fetch = fetch;
global.Headers = fetch.Headers;

const TEST_URL = 'http://localhost:8080';

describe('trae -> get', () => {
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
        .get('/comida')
        .reply(200, { foo: 'bar' });
    });

    beforeAll(async function executeRequest() {
      response = await trae.get(TEST_URL + '/comida')
      responseBody = await response.json()
    });

    it('should make an HTTP get request', function() {
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

    describe('get using params', function() {
      let request;
      let response;
      let responseBody;

      beforeAll(function createNock() {
        request = nock(TEST_URL, {
          reqheaders: {
            'content-type': 'application/json',
          },
        })
          .get('/cats')
          .query({ name: 'tigrin' })
          .reply(200, { yay: 'OK' });
      });

      beforeAll(async function executeRequest() {
        response = await trae.get(TEST_URL + '/cats', {
          params: {
            name: 'tigrin',
          },
        });
        responseBody = await response.json();
      });

      it('should make an HTTP get request', function() {
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

      it('should have yay OK in the response data', function() {
        const actual = responseBody;
        const expected = { yay: 'OK' };

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
        res.end('Hello from API!');
      }

      server = util.createServer({
        port: 8082,
        endpoint: '/comida',
        handler,
      });
    });

    beforeAll(async function executeRequest() {
      response = await trae.get('http://localhost:8082' + '/comida')
      responseBody = await response.text()
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP get request', function() {
      expect(response).toBeDefined();
    });

    it('should have the defined response data', function() {
      const actual = responseBody;
      const expected = 'Hello from API!';

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
