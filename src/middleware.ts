const identity  = response => response;
const rejection = err => Promise.reject(err);

function createMiddleware () {
  const collections = {
    before: [],
    after: []
  }

  const middleware = {
    collections,

    before: (fn) => {
      collections.before.push(fn)
      return collections.before.length - 1;
    },

    after: (fulfill = identity, reject = rejection) => {
      collections.after.push([fulfill, reject]);
      return collections.after.length - 1;
    },

    resolveBefore(config) {
      const chain = (promise, task) => promise.then(task);
      return collections.before.reduce(chain, Promise.resolve(config));
    }

    resolveAfter(err, response) {
      const chain   = (promise, task) => promise.then(...task);
      const initial = err ? Promise.reject(err) : Promise.resolve(response);
      return collections.after.reduce(chain, initial);
    }
  }

  return middleware
}

export default createMiddleware
