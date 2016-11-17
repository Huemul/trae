const path    = require('path');
const env     = require('yargs').argv.mode;
const webpack = require('webpack');

const projectRoot    = path.resolve(__dirname, '/');
const UglifyJsPlugin = webpack.optimize.UglifyJsPlugin;
const libraryName    = 'trae';

const plugins = [];
let outputFile;

if (env === 'build') {
  plugins.push(new UglifyJsPlugin({ minimize: true }));
  outputFile = `${libraryName}.min.js`;
} else {
  outputFile = `${libraryName}.js`;
}

const config = {
  entry  : `${__dirname}/lib/index.js`,
  devtool: 'source-map',
  output : {
    path          : `${__dirname}/dist`,
    filename      : outputFile,
    library       : libraryName,
    libraryTarget : 'umd',
    umdNamedDefine: true
  },
  module: {
    preLoaders: [{
      test   : /(\.jsx|\.js)$/,
      loader : 'eslint',
      include: projectRoot,
      exclude: /node_modules/
    }],
    loaders: [{
      test   : /(\.jsx|\.js)$/,
      loader : 'babel',
      include: [projectRoot],
      exclude: /node_modules\/(?!trae-query)/
    }]
  },
  resolve: {
    root      : path.resolve('./lib'),
    extensions: ['', '.js']
  },
  plugins
};

module.exports = config;
