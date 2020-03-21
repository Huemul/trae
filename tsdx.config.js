// https://www.npmjs.com/package/tsdx#customization
// Not transpiled with TypeScript or Babel, so use plain Es6/Node.js

const filesize = require('rollup-plugin-filesize');

module.exports = {
  rollup(config, options) {
    config.plugins.push(filesize());
    return config;
  },
};