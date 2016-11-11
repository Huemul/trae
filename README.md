# trae

> the fetch library

[ ![Codeship Status for Huemul/trae](https://img.shields.io/codeship/1d9dc9b0-84c0-0134-0393-62ca7b64624e.svg)](https://app.codeship.com/projects/183213)
[![Coverage Status](https://coveralls.io/repos/github/Huemul/trae/badge.svg?branch=master)](https://coveralls.io/github/Huemul/trae?branch=master)
[![bitHound Overall Score](https://www.bithound.io/github/Huemul/trae/badges/score.svg)](https://www.bithound.io/github/Huemul/trae)
[![bitHound Dependencies](https://www.bithound.io/github/Huemul/trae/badges/dependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/Huemul/trae/badges/devDependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/Huemul/trae/badges/code.svg)](https://www.bithound.io/github/Huemul/trae)

## Install

```bash
$ npm install --save trae
```

```bash
$ yarn add trae
```

## Basic Usage

A `GET` request to `/api/posts?id=123`:

```js
trae.get('/api/posts', { params: { id: 123 } })
  .then((json) => {
    console.log(json);
  })
  .catch((err) => {
    console.error(err);
  });
```

A `POST` request to `/api/posts`:

```js
trae.post('/api/posts', {
  title: 'My Post',
  content: 'My awesome post content...'
})
  .then(() => {
    console.log('Success!!!');
  })
  .catch((err) => {
    console.error(err);
  });
```

## Trae API

### Request methods

```js
trae.get(url[, config])

trae.delete(url[, config])

trae.head(url[, config])

trae.post(url[, body[, config]])

trae.put(url[, body[, config]])

trae.patch(url[, body[, config]])
```

*NOTE*: the request method cannot be overwritten for the methods above.

### Defaults & middleware

#### `trae.defaults([config])`

Sets the default configuration to use on every requests. This is merged with the existing configuration.

```js
trae.defaults({
  mode: 'no-cors',
  credentials: 'same-origin'
})
```

When call with no param it acts as a getter, returning the defaults.

```js
const config = trae.defaults()
```

#### `trae.baseUrl([url])`

Acts as a shorthand for `trae.defaults({baseUrl: url})`. Also returns the `baseUrl` when no params are passed.

```js
const id = 123
trae.get(`/${id}`) // GET: /123

trae.baseUrl('/api/posts')

const baseUrl = trae.baseUrl()

console.log(baseUrl) // '/api/posts'

trae.get(`/${id}`) // GET: /api/posts/123
```

#### `trae.use(middlewares)`

Sets the middlewares to be used to intercept the request and responses.

```js
function addAccessToken(config) {
  config.headers['X-ACCESSS-TOKEN'] = getUserToken()
  return config
}

function normalizePosts(response) {
  return normalize(response.data, arrayOf(post))
}

function logErrors(err) {
  console.error(err)
}

trae.use({
  config: addAccessToken,
  fulfill: normalizePosts,
  reject: logErrors
})
```

Note that middlewares can be added separately.

```js
trae.use({
  config: addAccessToken
})

trae.use({
  fulfill: normalizePosts
})

trae.use({
  reject: logErrors
})
```

There is one thing to keep in mind though, `fulfill` and `reject` are chained together in the `then` of the promise. To keep things more consistent good practice would be to add `fulfill` and `reject` together.

When no `fulfill` is added, identity function is used, but when no `reject` is added, a rejected promise is returned, to be handled down the chain.

```js
trae.use({
  fulfill: normalizePosts,
  reject: logErrors
})

// will result on
trae.get('/api/posts')
  .then(normalizePosts, logErrors)

// vs

trae.use({
  fulfill: normalizePosts
})

trae.use({
  reject: logErrors
})

// will result on
trae.get('/api/posts')
  .then(normalizePosts, err => Promise.reject(err))
  .then(res => res, logErrors)

```

### Instances

#### `trae.create([config])`

Creates an instance of `Trae` with its own defaults and middleware. All the above methods can be used on instances as they are used with the exposed `trae`.

```js
const api = trae.create({baseUrl: '/api'})

api.get('/posts') // GET: /api/posts
```

## Contributing

[Create an issue](https://github.com/Huemul/trae/issues/new) to report any bugs you find.

If you want to submit a PR and do not know where to start or what to add check out the [project page](https://github.com/Huemul/trae/projects/1) to find out what we are working on, and what to contribute next.

## License

**MIT**
