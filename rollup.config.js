import uglify             from 'rollup-plugin-uglify'; // eslint-disable-line
import babel              from 'rollup-plugin-babel';
import replace            from 'rollup-plugin-replace';
import eslint             from 'rollup-plugin-eslint';
import conditional        from 'rollup-plugin-conditional';
import filesize           from 'rollup-plugin-filesize';
import resolve            from 'rollup-plugin-node-resolve';
import commonjs           from 'rollup-plugin-commonjs';
import visualizer         from 'rollup-plugin-visualizer';
import skipCommentsCustom from './utils/uglify-skip-comments';

const pkg = require('./package.json');

const env    = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const banner = `/**
 * Trae, the fetch library!
 *
 * @version: ${pkg.version}
 * @authors: ${pkg.author} | ${pkg.contributors[0]}
 */`;

export default {
  entry     : 'lib/index.js',
  dest      : isProd ? 'dist/trae.min.js' : 'dist/trae.js',
  format    : 'umd',
  moduleId  : 'trae',
  moduleName: 'trae',
  sourceMap : !isProd && 'inline',
  context   : 'window',
  banner,
  plugins: [
    eslint(),
    resolve({
      jsnext : true,
      main   : true,
      browser: true
    }),
    commonjs({
      namedExports: {
        'node_modules/qs/lib/index.js': ['stringify']
      }
    }),
    babel({
      babelrc: false, // jest makes use of .babelrc
      presets: ['es2015-rollup']
    }),
    replace({
      exclude               : 'node_modules/**',
      'process.env.NODE_ENV': JSON.stringify(env),
      NODE_ENV              : JSON.stringify(env)
    }),
    conditional({
      condition: isProd,
      plugin   : uglify({ output: { comments: skipCommentsCustom } })
    }),
    visualizer({ filename: './coverage/bundle-statistics.html' }),
    filesize()
  ]
};
