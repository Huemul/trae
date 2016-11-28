# trae

Minimalistic HTTP client for the browser. Based on [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API, allows `trae` to be future-proofing, to have a clean implementation and support streaming among other goodies.

[ ![Codeship Status for Huemul/trae](https://img.shields.io/codeship/1d9dc9b0-84c0-0134-0393-62ca7b64624e/master.svg)](https://app.codeship.com/projects/183213)
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

*NOTE*: the request method cannot be overwritten for the methods above.

[⬆ back to top](#content)

### Defaults

#### `trae.defaults([config])`

Sets the default configuration to use on every requests. This is merged with the existing configuration.

```js
trae.defaults({
  mode       : 'no-cors',
  credentials: 'same-origin'
});
```

When called with no param it acts as a getter, returning the defined defaults.

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

#### `trae.use(middlewares)`

Sets the middlewares to be used to intercept the requests configuration, fulfilled and rejection responses.

```js
function addAccessToken(config) {
  config.headers['X-ACCESSS-TOKEN'] = getUserToken();
  return config;
}

function normalizeResponse(response) {
  response.data.fooAttribute = 'foo';
  return response;
}

function logErrors(err) {
  console.error(err);
  return Promise.reject(err);
}

trae.use({
  config : addAccessToken,
  fulfill: normalizeResponse,
  reject : logErrors
})
```

Note that middlewares can be added separately:

```js
trae.use({
  config: addAccessToken
})

trae.use({
  fulfill: normalizeResponse
})

trae.use({
  reject: logErrors
})
```

There is one thing to keep in mind though, `fulfill` and `reject` middlewares are chained together in the `then` state of the promise. To keep things more consistent a good practice would be to add them together.

```js
// Defining fulfill and reject middlewares together
trae.use({
  fulfill: normalizeResponse,
  reject : logErrors
});

// will result on the following behavior
trae.get('/api/posts')
  .then(normalizeResponse, logErrors);

```

When no `fulfill` is added, identity function is used, but when no `reject` is added, a rejected promise is returned, to be handled down the chain.

```js
// Defining fulfill and reject middlewares separately
trae.use({
  fulfill: normalizeResponse
});

trae.use({
  reject: logErrors
});

// will result on the following behavior
trae.get('/api/posts')
  .then(normalizeResponse, err => Promise.reject(err))
  .then(res => res, logErrors)

```

[⬆ back to top](#content)

### Instances

#### `trae.create([config])`

Creates an instance of `Trae` with its own defaults and middlewares. The API documentation applies for instances as well.

```js
const api = trae.create({baseUrl: '/api'})

api.get('/posts') // GET: /api/posts
```

[⬆ back to top](#content)

## Response

The request methods return a promise that resolves to this object:

```js
{
  // the response that came from the server
  data: {},

  // status code of the response
  status: 200,

  // status message of the response
  statusText: 'OK',

  // headers of the response
  headers: {},
}
```

#### data

`data` is read using `response.json()` when `response.headers['Content-Type']` contains `application/json` and will be an object, otherwise it is read using `response.text()` and will result in a string. If you need to use [another reader ](https://developer.mozilla.org/en-US/docs/Web/API/Body), it can be specified by setting the `bodyType` config property.

#### headers

`headers` is an instance of [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers/Headers) class, it has methods handlers like `append`, `get`, `getAll`, `has`, `set`.

```js
trae.get('/api/posts')
  .then(({ data, status, statusText, headers }) => {
    console.log(data);
    console.log(status);
    console.log(statusText);
    console.log(headers);
  });
```

[⬆ back to top](#content)

## Contributing

[Create an issue](https://github.com/Huemul/trae/issues/new) to report bugs or if you have any suggestion on how to improve this project.

If you want to submit a PR and do not know where to start or what to add check out the [project page](https://github.com/Huemul/trae/projects/1) to find out what we are working on, and what to contribute next.

## License

[MIT License](https://github.com/Huemul/trae/blob/master/LICENSE)

[⬆ back to top](#content)
