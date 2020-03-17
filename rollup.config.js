import typescript from 'rollup-plugin-typescript2';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import external from 'rollup-plugin-peer-deps-external';
import filesize from 'rollup-plugin-filesize';
import pkg from './package.json';

// const bannerText = `
//   Trae, the fetch library!
//   ========================
//   @version: ${pkg.version}
//   @authors: ${pkg.author} | ${pkg.contributors[0]}`;

export default {
  input: './src/index.ts',
  output: [
    {
      file: pkg.main,
      format: 'cjs',
      exports: 'named',
      sourcemap: true
    },
    {
      file: pkg.module,
      format: 'es',
      exports: 'named',
      sourcemap: true
    }
  ],
  plugins: [
    external(),
    resolve(),
    typescript({
      rollupCommonJSResolveHack: true,
      clean: true
    }),
    commonjs({
      include: ['node_modules/**']
    }),
    filesize()

    // TODO: banner plugin breaks the source map
    // banner(bannerText)
  ]
};
