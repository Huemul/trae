const rollup             = require('rollup');
const uglify             = require('rollup-plugin-uglify');
const babel              = require('rollup-plugin-babel');
const replace            = require('rollup-plugin-replace');
const eslint             = require('rollup-plugin-eslint');
const conditional        = require('rollup-plugin-conditional');
const filesize           = require('rollup-plugin-filesize');
const resolve            = require('rollup-plugin-node-resolve');
const commonjs           = require('rollup-plugin-commonjs');
const visualizer         = require('rollup-plugin-visualizer');
const builtins           = require('rollup-plugin-node-builtins');
const globals            = require('rollup-plugin-node-globals');
const json               = require('rollup-plugin-json');

const skipCommentsCustom = require('./uglify-skip-comments');
const generateBanner     = require('./generate-banner');
const generateBundleName = require('./generate-bundle-name');
const pkg                = require('../package.json');


const env    = process.env.NODE_ENV || 'development';
const isProd = env === 'production';


let promise = Promise.resolve();

['cjs', 'umd'].forEach((format) => {
  promise = promise.then(() => rollup.rollup({
    entry  : 'lib/index.js',
    context: 'global',
    plugins: [
      json({
        include    : 'package.json',
        preferConst: true
      }),
      eslint({
        exclude: 'package.json'
      }),
      conditional(format === 'cjs', [globals(), builtins()]),
      resolve({
        jsnext        : format === 'umd',
        main          : true,
        browser       : format === 'umd',
        preferBuiltins: true
      }),
      commonjs({
        namedExports: {
          'node_modules/qs/lib/index.js': ['stringify']
          // 'node_modules/whatwg-fetch/fetch.js': ['default']
        }
      }),
      babel({
        babelrc: false, // jest makes use of .babelrc
        presets: ['es2015-rollup'],
        exclude: ['node_modules/**', '*.json']
      }),
      replace({
        exclude               : ['node_modules/**', '*.json'],
        'process.env.NODE_ENV': JSON.stringify(env),
        NODE_ENV              : JSON.stringify(env)
      }),
      visualizer({ filename: `./coverage/${format}-bundle-statistics.html` }),
      conditional(isProd && format === 'umd', [uglify({ output: { comments: skipCommentsCustom } })]),
      filesize()
    ]
  })
  .then(bundle => bundle.write({
    dest      : `dist/${generateBundleName(format, isProd)}.js`,
    banner    : generateBanner(pkg.version, pkg.author, pkg.contributors),
    sourceMap : !isProd && format === 'umd' && 'inline',
    moduleName: format === 'umd' ? pkg.name : undefined,
    format
  })));
});

promise.catch(err => console.error(err.stack));
