import { PublicRequestConfig } from './types';

type UnkwnownIdentity = (a: unknown) => unknown;

const identity: UnkwnownIdentity = (response) => response;
const rejection: UnkwnownIdentity = (err) => Promise.reject(err);

type HandlerBefore = (conf: PublicRequestConfig) => PublicRequestConfig;
type HandlerAfter = [UnkwnownIdentity, UnkwnownIdentity];

interface Collections {
  before: HandlerBefore[];
  after: HandlerAfter[];
}

function createMiddleware() {
  const collections: Collections = {
    before: [],
    after: [],
  };

  const middleware = {
    collections,

    before: (fn: HandlerBefore) => {
      collections.before.push(fn);
      return collections.before.length - 1;
    },

    after: (fulfill = identity, reject = rejection) => {
      collections.after.push([fulfill, reject]);
      return collections.after.length - 1;
    },

    resolveBefore(config: PublicRequestConfig) {
      return collections.before.reduce(
        (promise, task) => promise.then(task),
        Promise.resolve(config),
      );
    },

    resolveAfter(err: Error | undefined, response: unknown | undefined) {
      return collections.after.reduce(
        (promise, [fulfilled, rejected]) => promise.then(fulfilled, rejected),
        err ? Promise.reject(err) : Promise.resolve(response),
      );
    },
  };

  return middleware;
}

export default createMiddleware;
