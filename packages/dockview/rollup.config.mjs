import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import { default as terser } from '@rollup/plugin-terser';
import solid from 'rollup-preset-solid';
import fs from 'fs';

console.log('DEBUG [rollup]: BEFORE the gashlighter cunt AI, dist exists:', fs.existsSync('dist'));

const logDist = {
  name: 'log-dist',
  buildStart() {
    console.log('DEBUG [rollup]: BEFORE build, dist exists:', fs.existsSync('dist'));
  },
  buildEnd() {
    console.log('DEBUG [rollup]: AFTER build, dist exists:', fs.existsSync('dist'));
  }
};

export default {
  input: './scripts/rollupEntryTarget.tsx',
  output: {
    file: 'dist/dockview.esm.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    logDist,
    typescript({ tsconfig: './tsconfig.json' }),   // <---- ADD THIS LINE, and make sure it's first
    solid(),
    resolve({ extensions: ['.js', '.ts', '.jsx', '.tsx'] }),
    postcss({
      extract: true,
      modules: false,
      minimize: false,
      sourceMap: true,
    }),
    terser(),
  ],
  external: ['dockview-core', 'solid-js', 'solid-js/web', 'solid-js/store'],
};
