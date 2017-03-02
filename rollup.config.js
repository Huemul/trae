import uglify             from 'rollup-plugin-uglify'; // eslint-disable-line
import babel              from 'rollup-plugin-babel';
import replace            from 'rollup-plugin-replace';
import eslint             from 'rollup-plugin-eslint';
import conditional        from 'rollup-plugin-conditional';
import filesize           from 'rollup-plugin-filesize';
import resolve            from 'rollup-plugin-node-resolve';
import commonjs           from 'rollup-plugin-commonjs';
import visualizer         from 'rollup-plugin-visualizer';
import builtins           from 'rollup-plugin-node-builtins';
import globals            from 'rollup-plugin-node-globals';
import skipCommentsCustom from './utils/uglify-skip-comments';

const pkg = require('./package.json');

const env       = process.env.NODE_ENV || 'development';
const format    = process.env.FORMAT || 'umd';
const isProd    = env === 'production';
const isNodeEnv = format === 'cjs';
const banner    = `/**
 * Trae, the fetch library!
 *
 * @version: ${pkg.version}
 * @authors: ${pkg.author} | ${pkg.contributors[0]}
 */`;

const generateDestName = () => {
  if (isNodeEnv) { return 'dist/trae.js'; }
  return isProd ? 'dist/trae.min.js' : 'dist/development.js';
};

export default {
  entry     : 'lib/index.js',
  dest      : generateDestName(),
  moduleId  : 'trae',
  moduleName: 'trae',
  sourceMap : !isProd && !isNodeEnv && 'inline',
  context   : 'global',
  format,
  banner,
  plugins: [
    globals(),
    builtins(),
    eslint(),
    resolve({
      jsnext : !isNodeEnv,
      main   : true,
      browser: !isNodeEnv,
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
      exclude: 'node_modules/**'
    }),
    replace({
      exclude               : 'node_modules/**',
      'process.env.NODE_ENV': JSON.stringify(env),
      NODE_ENV              : JSON.stringify(env)
    }),
    conditional(isProd && !isNodeEnv, uglify({ output: { comments: skipCommentsCustom } })),
    visualizer({ filename: './coverage/bundle-statistics.html' }),
    filesize()
  ]
};
