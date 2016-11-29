const identity  = response => response;
const rejection = err => Promise.reject(err);

export default class Middleware {
  constructor() {
    this._req = [];
    this._res = [];
    this._postRes = [];
  }

  request(fn) {
    this._req.push(fn);
    return this._req.length - 1;
  }

  response(fulfill = identity, reject = rejection) {
    this._res.push({ fulfill, reject });
    return this._res.length - 1;
  }

  postResponse(fn) {
    this._postRes.push(fn);
    return this._postRes.length - 1;
  }

  resolveRequests(config) {
    return this._req.reduce((promise, task) => {
      promise = promise.then(task);
      return promise;
    }, Promise.resolve(config));
  }

  resolveResponses(response) {
    return this._res.reduce((promise, task) => {
      promise = promise.then(task.fulfill, task.reject);
      return promise;
    }, Promise.resolve(response));
  }

  resolvePostResponses(res) {
    return this._postRes.reduce((promise, task) => {
      promise = promise.then(task);
      return promise;
    }, Promise.resolve(res));
  }
}
