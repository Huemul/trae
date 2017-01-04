# trae

Minimalistic HTTP client for the browser. Based on [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API, allows `trae` to be future-proofing, to have a clean implementation and support streaming among other goodies.

[![Codeship Status for Huemul/trae](https://img.shields.io/codeship/1d9dc9b0-84c0-0134-0393-62ca7b64624e/master.svg)](https://app.codeship.com/projects/183213)
[![Coverage Status](https://coveralls.io/repos/github/Huemul/trae/badge.svg?branch=master)](https://coveralls.io/github/Huemul/trae?branch=master)
[![bitHound Overall Score](https://www.bithound.io/github/Huemul/trae/badges/score.svg)](https://www.bithound.io/github/Huemul/trae)
[![bitHound Dependencies](https://www.bithound.io/github/Huemul/trae/badges/dependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/Huemul/trae/badges/devDependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/Huemul/trae/badges/code.svg)](https://www.bithound.io/github/Huemul/trae)

## Content

1. [Install](#install)
1. [Basic Usage](#basic-usage)
1. [Trae API](#trea-api)
  1. [Request methods](#request-methods)
  1. [Config](#config)
  1. [Defaults](#defaults)
  1. [Middlewares](#middlewares)
  1. [Instances](#instances)
1. [Response](#response)
1. [Contributing](#contributing)

## Install

```bash
$ npm install --save trae
```

```bash
$ yarn add trae
```

## Basic Usage

A `GET` request to `https://www.google.com.ar/search?q=foo`:

```js
trae.get('https://www.google.com.ar/search', { params: { q: 'foo' } })
  .then((response) => {
    console.log(response);
  })
  .catch((err) => {
    console.error(err);
  });
```

A `POST` request to `https://www.foo.com/api/posts`:

```js
trae.post('https://www.foo.com/api/posts', {
  title  : 'My Post',
  content: 'My awesome post content...'
})
  .then(() => {
    console.log('Success!!!');
  })
  .catch((err) => {
    console.error(err);
  });
```

[⬆ back to top](#content)

## Trae API

### Request methods

```js
trae.get(url[, config]);

trae.delete(url[, config]);

trae.head(url[, config]);

trae.post(url[, body[, config]]);

trae.put(url[, body[, config]]);

trae.patch(url[, body[, config]]);
```

[⬆ back to top](#content)

### Config

The configuration object can be used in all request methods, the following attributes are available:

```javascript
{
  // Absolute or relative url of the request
  url: '/foo/bar',

  // The URL parameters to be sent with the request
  params: {
    id: 123
  },

  // Represents the body of the response, allowing you to declare what its content type is and how it should be handled.
  // Available readers are `arrayBuffer`, `blob`, `formData`, `json`, `text` and `raw`. The last one returns the response body without being     
  // parsed. `raw` is used for streaming the response body among other things.
  // @link: https://developer.mozilla.org/en-US/docs/Web/API/Body
  bodyType: 'json',

  // The Headers object associated with the request
  headers: {
    'Accept': 'application/json, text/plain, */*', // Default
    'Content-Type': 'application/json' // Default
    'X-My-Custom-Header': 'foo-bar'
  },

  // The mode of the request. Available values are: `same-origin`, `no-cors`, `cors` and `navigate`
  // @link: https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
  // Default: 'cors'
  mode: 'same-origin',

  // Indicates whether the user agent should send cookies from the other domain in the case of cross-origin requests.
  // @link: https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials
  // Default: 'omit'
  credentials: 'same-origin',

  // The cache mode of the request. Available values are:
  // `default`, `no-store`, `reload`, `no-cache`, `force-cache` and `only-if-cached`
  // @link: https://developer.mozilla.org/en-US/docs/Web/API/Request/cache
  // Default: 'default'
  cache: 'only-if-cached'
}
```
More information about Request properties can be found on this [`MDN article`](https://developer.mozilla.org/en-US/docs/Web/API/Request).

### Defaults

#### `trae.defaults([config])`

Sets the default configuration to use on every requests. This is merged with the existing configuration.

```js
trae.defaults({
  mode       : 'no-cors',
  credentials: 'same-origin'
});
```

When called with no params acts as a getter, returning the defined defaults.

```js
const config = trae.defaults();
```

#### `trae.baseUrl([url])`

Shorthand for `trae.defaults({baseUrl: url})`. Also returns the `baseUrl` when no params are passed.

```js
trae.baseUrl('https://www.foo.com');

const baseUrl = trae.baseUrl();
console.log(baseUrl); // 'https://www.foo.com'

trae.get('/baz'); // GET: https://www.foo.com/baz
```

### Middlewares

`trae` api provides three middleware methods, `before`, `after` and `finally`.

#### `trae.before([middleware])`

Runs before the request is made and it has access to the configuration object, it is run in a promise chain, so it should always return the configuration object.

```js
const beforeMiddleware = (config) => {
  config.headers['X-ACCESSS-TOKEN'] = getUserToken();
  return config;
}

trae.before(beforeMiddleware);
```

#### `trae.after(fullfill[, reject])`

Runs after the request is made, it chains the the provided `fullfill` and `reject` methods together to the `then` method from fetch response. When no `fulfill` callback is provided, the identity function is used. When no `reject` callback is provided, a rejected promise is returned, to be handled down the chain.

```js
const fullfillMiddleware = (res) => {
  console.log(res);
  res.data.foo = 'bar'
  return res;
};

const rejectMiddleware = (err) => {
  console.error(err);
  err.foo = 'bar';
  return Promise.reject(err);
};

trae.after(fullfillMiddleware, rejectMiddleware);
```

Using the above `after` middleware is the same as doing:

```js
trae.get('/api/posts')
  .then(fullfillMiddleware, rejectMiddleware);
```

#### `trae.finally([middleware])`

Runs at the end regardless of the request result. Is not promise based. Functions provided to this method are run synchronously.

```js
const finallyMiddleware = () => {
  console.log('The End');
  makeTheSpinnerStop();
};

trae.finally(finallyMiddleware);
```

[⬆ back to top](#content)

### Instances

#### `trae.create([config])`

Creates an instance of `Trae` with its own defaults and middlewares. The API documentation applies for instances as well.

```js
const api = trae.create({baseUrl: '/api'})

api.get('/posts') // GET: /api/posts
```

The created method inherits all the defaults and middlewares from its creator.

```js
trae.baseUrl('/api')
const api = trae.create()

api.get('/posts') // GET: /api/posts

api.defaults({ mode: 'no-cors' })

const apiFoo = api.create()

apiFoo.defaults() // { mode: 'no-cors', ... }
```


[⬆ back to top](#content)

## Response

The request methods return a promise that resolves to this object:

```js
{
  // the response that came from the server
  data: { ... },

  // status code of the response
  status: 200,

  // status message of the response
  statusText: 'OK',

  // headers of the response
  headers: { ... },
}
```

#### data

`data` is read using `response.json()` when `response.headers['Content-Type']` contains `application/json` and will be an object, otherwise it is read using `response.text()` and will result in a string. If you need to use [another reader ](https://developer.mozilla.org/en-US/docs/Web/API/Body), it can be specified by setting the `bodyType` [config property](#config).

#### headers

`headers` is an instance of [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers/Headers), it has methods handlers like `append`, `get`, `getAll`, `has`, `set`.

[⬆ back to top](#content)

## Contributing

[Create an issue](https://github.com/Huemul/trae/issues/new) to report bugs or give suggestions on how to improve this project.

If you want to submit a PR and do not know where to start or what to add check out the [project page](https://github.com/Huemul/trae/projects/1) to find out what we are working on, and what to contribute next.

## License

[MIT License](https://github.com/Huemul/trae/blob/master/LICENSE)

[⬆ back to top](#content)
