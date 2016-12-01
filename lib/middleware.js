export default class Middleware {
  constructor() {
    this._before  = [];
    this._success = [];
    this._error   = [];
    this._after   = [];
  }

  before(fn) {
    this._before.push(fn);
    return this._before.length - 1;
  }

  success(success = res => res) {
    this._success.push(success);
    return this._success.length - 1;
  }

  error(fn) {
    this._error.push(fn);
    return this._error.length - 1;
  }

  after(fn) {
    this._after.push(fn);
    return this._after.length - 1;
  }

  resolveBefore(config) {
    return this._before.reduce((promise, before) => {
      promise = promise.then(before);
      return promise;
    }, Promise.resolve(config));
  }

  resolveSuccess(res) {
    return this._success.reduce((promise, success) => {
      promise = promise.then(success);
      return promise;
    }, Promise.resolve(res));
  }

  resolveError(err) {
    this._error.forEach(fn => fn && fn.call && fn(err));
    return Promise.reject(err);
  }

  resolveAfter(err, res) {
    return this._after.reduce((promise, after) => {
      promise = err ? promise.catch(after) : promise.then(after);
      return promise;
    }, err ? Promise.reject(err) : Promise.resolve(res));
  }
}
