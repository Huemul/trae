const identity  = response => response;
const rejection = err => Promise.reject(err);


export default class Middleware {
  constructor() {
    this._before  = [];
    this._after   = [];
    this._finally = [];
  }

  before(fn) {
    this._before.push(fn);
    return this._before.length - 1;
  }

  after(fulfill = identity, reject = rejection) {
    this._after.push({ fulfill, reject });
    return this._after.length - 1;
  }

  finally(fn) {
    this._finally.push(fn);
    return this._finally.length - 1;
  }

  resolveBefore(config) {
    const chain = (promise, task) => promise.then(task);
    return this._before.reduce(chain, Promise.resolve(config));
  }

  resolveAfter(err, response) {
    const chain   = (promise, task) => promise.then(task.fulfill, task.reject);
    const initial = err ? Promise.reject(err) : Promise.resolve(response);
    return this._after.reduce(chain, initial);
  }


  resolveFinally() {
    this._finally.forEach(task => task());
  }
}
