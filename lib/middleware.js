
class Middleware {
  constructor() {
    this._req = [];
    this._res = [];
  }

  request(fn) {
    this._req.push(fn);
    return this._req.length - 1;
  }

  response(fulfill, reject) {
    fulfill || (fulfill = res => Promise.resolve(res));
    reject  || (reject  = err => Promise.reject(err));

    this._res.push({ fulfill, reject });
    return this._res.length - 1;
  }

  resolveRequests(config) {
    const tasks = this._req.slice();
    let promise = Promise.resolve(config);

    while (tasks.length) {
      promise = promise.then(tasks.shift());
    }
    return promise;
  }

  resolveResponses(response) {
    const tasks = this._res.slice();
    let promise = Promise.resolve(response);

    while (tasks.length) {
      const task = tasks.shift();
      promise = promise.then(task.fulfill, task.reject);
    }
    return promise;
  }
}

module.exports = Middleware;
