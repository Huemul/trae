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

## Defaults & middleware

### `trae.defaults([config])`

Sets the defaults configuration to use on the requests. This is merged with the default configuration.

```js
trae.defaults({
  mode: 'no-cors',
  credentials: 'same-origin'
})
```

When call with no param it acts as a getter, returning the configuration.

```js
trae.defaults()
```
