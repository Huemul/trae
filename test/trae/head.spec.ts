// @ts-nocheck
/* global describe beforeAll beforeEach afterEach it expect */

import url from 'url';
import nock from 'nock';
import fetch from 'node-fetch';
import trae from '../../src';
import util from './util';
import http from 'http';

global.fetch = fetch;
global.Headers = fetch.Headers;

const TEST_URL = 'http://localhost:8080';

describe('trae -> head', () => {
  describe('Using nock', () => {
    let request;
    let response;

    beforeAll(function createNock() {
      request = nock(TEST_URL, {
        reqheaders: {
          'content-type': 'application/json',
        },
      })
        .head('/')
        .reply(200);
    });

    beforeAll(function executeRequest() {
      return trae.head(TEST_URL + '/').then(function (res) {
        response = res;
      });
    });

    it('should make an HTTP head request', function () {
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

  describe('Using http server', () => {
    let server;
    let response: http.Response;

    beforeAll(function createServer() {
      function handler(req: http.IncomingMessage, res: http.ServerResponse) {
        res.end('Hello from API!');
      }

      server = util.createServer({
        port: 8083,
        endpoint: '/head',
        handler,
      });
    });

    beforeAll(function executeRequest() {
      return trae.head('http://localhost:8083/head').then(function (res) {
        response = res;
      });
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP head request', function () {
      expect(response).toBeDefined();
    });

    it('should not have a response body', function () {
      const actual = response.data;
      const expected = '';

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
