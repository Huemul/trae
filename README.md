<h1 align="center">
  <img src="https://github.com/Huemul/trae/blob/master/assets/logo.png" alt="trae">
</h1>

Minimalistic HTTP client for the browser and Node. Based on [Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) API, allows `trae` to be future-proofing, to have a clean implementation and support streaming among other goodies.

[![Codeship Status for Huemul/trae](https://app.codeship.com/projects/1d9dc9b0-84c0-0134-0393-62ca7b64624e/status?branch=master)](https://app.codeship.com/projects/183213)
[![Coverage Status](https://coveralls.io/repos/github/Huemul/trae/badge.svg?branch=master)](https://coveralls.io/github/Huemul/trae?branch=master)
[![bitHound Overall Score](https://www.bithound.io/github/Huemul/trae/badges/score.svg)](https://www.bithound.io/github/Huemul/trae)
[![bitHound Dependencies](https://www.bithound.io/github/Huemul/trae/badges/dependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/Huemul/trae/badges/devDependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/Huemul/trae/badges/code.svg)](https://www.bithound.io/github/Huemul/trae)
[![All Contributors](https://img.shields.io/badge/all_contributors-6-orange.svg?style=flat-square)](#contributors)

## Content

1.  [Install](#install)
1.  [Basic Usage](#basic-usage)
1.  [Polyfill](#Polyfill)
1.  [Trae API](#trea-api)
    1.  [Request methods](#request-methods)
    1.  [Config](#config)
    1.  [Defaults](#defaults)
    1.  [Middlewares](#middlewares)
    1.  [Instances](#instances)
1.  [Response](#response)
    1.  [Data](#data)
    1.  [Headers](#headers)
1.  [Rejection](#rejection)
1.  [Resources](#resources)
1.  [License](#license)
1.  [Contributing](#contributing)
1.  [Contributors](#contributors)
1.  [TODO](#todo)

## Install

```bash
$ npm install --save trae
```

```bash
$ yarn add trae
```

[UMD](https://github.com/umdjs/umd) is also provided.

```html
<script src="//unpkg.com/trae"></script>
```

## Basic Usage

A `GET` request to `https://www.google.com.ar/search?q=foo`:

```js
trae
  .get('https://www.google.com.ar/search', { params: { q: 'foo' } })
  .then((response) => {
    console.log(response)
  })
  .catch((err) => {
    console.error(err)
  })
```

A `POST` request to `https://www.foo.com/api/posts`:

```js (skip)
trae
  .post('https://www.foo.com/api/posts', {
    title: 'My Post',
    content: 'My awesome post content...',
  })
  .then(() => {
    console.log('Success!!!')
  })
  .catch((err) => {
    console.error(err)
  })
```

Check out more examples [here](https://huemul.github.io/trae-examples).

[⬆ back to top](#content)

## Polyfills

Since most browsers ([caniuse](https://caniuse.com/#search=fetch)) support Fetch already and some common boilerplates include it (i.e. [create-react-app](https://github.com/facebook/create-react-app)) `trae` does not add a polyfill by default.

If you do need the poyfill, we provide two options:

- `trae/unfetch`: uses [`unfetch`](https://github.com/developit/unfetch), a bare minimum fetch polyfill in **500 bytes** by [@developit](https://github.com/developit). Check the README to make sure your use case is supported.
- `trae/isomorphic`: uses [`isomorphic-fetch`](https://github.com/matthew-andrews/isomorphic-fetch). Use this one if you are working on **node**, or need things not covered by `unfetch`.

### Promises

If your environment doesn't support ES6 Promises, add the [polyfill](https://github.com/stefanpenner/es6-promise).

## Trae API

### Request methods

```js (skip)
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

```js (skip)
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
    'Content-Type': 'application/json' // Default header for methods with body (patch, post & put)
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
  mode: 'no-cors',
  credentials: 'same-origin',
})
```

When called with no params acts as a getter, returning the defined defaults.

```js
const config = trae.defaults()
```

It is possible to set default configuration for specific methods passing an
object with the method as key:

```js
trae.defaults({
  post: {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  },
})
```

#### Request configuration precedence

The configuration for a request will be merged following this precedence rules, each level overrides the followings:

1.  Request params config.
1.  Method config set with `trae.defaults({ [method]: { ... } })`.
1.  Trae config set with `trae.defaults({ ... })`.

#### `trae.baseUrl([url])`

Shorthand for `trae.defaults({baseUrl: url})`. Also returns the `baseUrl` when no params are passed.

```js (skip)
trae.baseUrl('https://www.foo.com')

const baseUrl = trae.baseUrl()
console.log(baseUrl) // 'https://www.foo.com'

trae.get('/baz') // GET: https://www.foo.com/baz
```

### Middlewares

`trae` api provides three middleware methods, `before`, `after` and `finally`.

#### `trae.before([middleware])`

Runs before the request is made and it has access to the configuration object, it is run in a promise chain, so it should always return the configuration object.

```js
const beforeMiddleware = (config) => {
  config.headers['X-ACCESSS-TOKEN'] = getUserToken()
  return config
}

trae.before(beforeMiddleware)
```

#### `trae.after(fullfill[, reject])`

Runs after the request is made, it chains the provided `fullfill` and `reject` methods together to the `then` method from fetch response. When no `fulfill` callback is provided, the identity function is used. When no `reject` callback is provided, a rejected promise is returned, to be handled down the chain.

```js
const fullfillMiddleware = (res) => {
  console.log(res)
  res.data.foo = 'bar'
  return res
}

const rejectMiddleware = (err) => {
  console.error(err)
  err.foo = 'bar'
  return Promise.reject(err)
}

trae.after(fullfillMiddleware, rejectMiddleware)
```

Using the above `after` middleware is the same as doing:

```js (skip)
trae.get('/api/posts').then(fullfillMiddleware, rejectMiddleware)
```

#### `trae.finally([middleware])`

Runs at the end regardless of the request result, it has access to the configuration object and the url that was used to made the request. Is not promise based. Functions provided to this method are run synchronously.

```js
const finallyMiddleware = (config, url) => {
  console.log('The End')
  makeTheSpinnerStop()
}

trae.finally(finallyMiddleware)
```

[⬆ back to top](#content)

### Instances

#### `trae.create([config])`

Creates an instance of `Trae` with its own defaults and middlewares. The API documentation applies for instances as well.

```js (skip)
const api = trae.create({ baseUrl: '/api' })

api.get('/posts') // GET: /api/posts
```

The created method inherits all the defaults and middlewares from its creator.

```js (skip)
trae.baseUrl('/api')
const api = trae.create()

api.get('/posts') // GET: /api/posts

api.defaults({ mode: 'no-cors' })

const apiFoo = api.create()

apiFoo.defaults() // { mode: 'no-cors', ... }
```

[⬆ back to top](#content)

## Response

The request methods returns a promise that resolves to this object:

```js (skip)
{
  // body of the response
  data: { ... },

  // status code of the response
  status: 200,

  // status message of the response
  statusText: 'OK',

  // headers of the response
  headers: { ... },

  // the config used to execute the request
  config: { ... },
}
```

#### Data

Response body is read using `response.json()` when `response.headers['Content-Type']` contains `application/json` and will be an object, otherwise it is read using `response.text()` and will result in a string. If you need to use [another reader ](https://developer.mozilla.org/en-US/docs/Web/API/Body), it can be specified by setting the `bodyType` [config property](#config).

`bodyType` is not used on rejection, response body is read according to `response.headers['Content-Type']`.

In both cases it is passed to the after middleware as the `data` property.

#### Headers

`headers` is an instance of [Headers](https://developer.mozilla.org/en-US/docs/Web/API/Headers/Headers), it has methods handlers like `append`, `get`, `getAll`, `has`, `set`.

## Rejection

On rejection an `Error` is passed to the rejection middleware with the same properties as the response object.

[⬆ back to top](#content)

## Resources

- Motivation: if you want to know more about the motivations behind this library check out [this article](https://hackernoon.com/trae-another-http-library-70000860a5f4).
- Middlewares
  - [`trae-events`](https://github.com/Huemul/trae-events).
  - [`trae-logger`](https://github.com/Huemul/trae-logger).

## License

[MIT License](https://github.com/Huemul/trae/blob/master/LICENSE).

## Contributing

[Create an issue](https://github.com/Huemul/trae/issues/new) to report bugs or give suggestions on how to improve this project.

If you want to submit a PR and do not know where to start or what to add check out the [project page](https://github.com/Huemul/trae/projects/1) to find out what we are working on, and what to contribute next.

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

| [<img src="https://avatars.githubusercontent.com/u/6719053?v=3" width="64px;"/><br /><sub>Nicolas Del Valle</sub>](http://nico.delvalle.xyz)<br />[💻](https://github.com/Huemul/trae/commits?author=ndelvalle) [📖](https://github.com/Huemul/trae/commits?author=ndelvalle) [⚠️](https://github.com/Huemul/trae/commits?author=ndelvalle) 💡 👀 | [<img src="https://avatars.githubusercontent.com/u/8309423?v=3" width="64px;"/><br /><sub>Christian Gill</sub>](https://gillchristian.xyz)<br />[💻](https://github.com/Huemul/trae/commits?author=gillchristian) [📖](https://github.com/Huemul/trae/commits?author=gillchristian) [⚠️](https://github.com/Huemul/trae/commits?author=gillchristian) 💡 👀 | [<img src="https://avatars.githubusercontent.com/u/3258966?v=3" width="64px;"/><br /><sub>Ignacio Anaya</sub>](http://keepe.rs)<br />[💻](https://github.com/Huemul/trae/commits?author=ianaya89) 👀 🎨 [🐛](https://github.com/Huemul/trae/issues?q=author%3Aianaya89) 💁 | [<img src="https://avatars.githubusercontent.com/u/1145624?v=3" width="64px;"/><br /><sub>Fred Guest</sub>](https://twitter.com/fredguest)<br />💁 [🐛](https://github.com/Huemul/trae/issues?q=author%3Afredguest) | [<img src="https://avatars.githubusercontent.com/u/11802102?v=3" width="64px;"/><br /><sub>Joni</sub>](http://joni.website)<br />🎨 | [<img src="https://avatars.githubusercontent.com/u/4614574?v=3" width="64px;"/><br /><sub>Gerardo Nardelli</sub>](https://gnardelli.com)<br />[📖](https://github.com/Huemul/trae/commits?author=patitonar) |
| :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |


<!-- ALL-CONTRIBUTORS-LIST:END -->

[⬆ back to top](#content)

## TODO

- [ ] CHANGELOG. [#48](https://github.com/Huemul/trae/issues/48)
- [ ] Add logging and warnings to the dev build. [#49](https://github.com/Huemul/trae/issues/49#issuecomment-272533323)
- [ ] Improve examples and add more. [`trae-exampels` repo](https://github.com/Huemul/trae-examples/).
- [ ] Add a way to remove middlewares.
- [ ] Add browser based tests.

[⬆ back to top](#content)
