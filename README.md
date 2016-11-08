# trae

> the fetch library

[ ![Codeship Status for Huemul/trae](https://img.shields.io/codeship/1d9dc9b0-84c0-0134-0393-62ca7b64624e.svg)](https://app.codeship.com/projects/183213)
[![Coverage Status](https://coveralls.io/repos/github/Huemul/trae/badge.svg?branch=master)](https://coveralls.io/github/Huemul/trae?branch=master)
[![bitHound Overall Score](https://www.bithound.io/github/Huemul/trae/badges/score.svg)](https://www.bithound.io/github/Huemul/trae)
[![bitHound Dependencies](https://www.bithound.io/github/Huemul/trae/badges/dependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Dev Dependencies](https://www.bithound.io/github/Huemul/trae/badges/devDependencies.svg)](https://www.bithound.io/github/Huemul/trae/master/dependencies/npm)
[![bitHound Code](https://www.bithound.io/github/Huemul/trae/badges/code.svg)](https://www.bithound.io/github/Huemul/trae)


# Install

```bash
$ npm install --save trae
```

```bash
$ yarn add trae
```

# Usage
```js
import trae from 'trae'

// GET: `/api/posts?id=123`
trae.get('/api/posts', { data: { id: 123 } })
  .then((json) => {
    console.log(json);
  })
  .catch((err) => {
    console.error(err);
  });

// POST: `/api/posts`
trae.post('/api/posts', {
  body: {
    title: 'My Post',
    content: 'My awesome post content...'
  }
})
  .then(() => {
    console.log('Success!!!');
  })
  .catch((err) => {
    console.error(err);
  });
```
