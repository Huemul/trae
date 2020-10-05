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

describe('trae -> delete', () => {
  describe('Using nock', () => {
    let request;
    let response;

    beforeAll(function createNock() {
      request = nock(TEST_URL)
        .delete('/airports/barcelona')
        .reply(204);
    });

    beforeAll(async function executeRequest() {
      response = await trae.delete(TEST_URL + '/airports/barcelona');
    });

    it('should make an HTTP delete request', function() {
      const actual = request.isDone();
      const expected = true;

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

    describe('delete using params', function() {
      let request;
      let response;

      beforeAll(function createNock() {
        request = nock(TEST_URL)
          .delete('/baz')
          .query({ name: 'foo' })
          .reply(200, { yay: 'OK' });
      });

      beforeAll(async function executeRequest() {
        response = await trae.delete(TEST_URL + '/baz', {
          params: {
            name: 'foo',
          },
        });
      });

      it('should make an HTTP delete request', function() {
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
        port: 8081,
        endpoint: '/delete',
        handler,
      });
    });

    beforeAll(async function executeRequest() {
      response = await trae.delete('http://localhost:8081' + '/delete');
      responseBody = await response.text();
    });

    afterAll((done) => server.shutdown(done));

    it('should make an HTTP delete request', function() {
      expect(response).toBeDefined();
    });

    it('should not have data in the response', function() {
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
