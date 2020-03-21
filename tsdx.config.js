const filesize = require('rollup-plugin-filesize');

module.exports = {
  rollup(config, options) {
    config.plugins.push(filesize());
    return config;
  },
};
