import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';
import { default as terser } from '@rollup/plugin-terser';
import solid from 'rollup-preset-solid';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stylesDir = path.join(__dirname, 'dist/styles');
if (!fs.existsSync(stylesDir)) {
  fs.mkdirSync(stylesDir, { recursive: true });
}

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
  input: './src/index.ts',  // Entry should be src/index.ts (not in a subfolder!)
  output: {
    file: 'dist/esm/index.js',   // ESM output, flat structure
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    logDist,
    solid(),
    typescript({
      tsconfig: './tsconfig.esm.json',      // <--- USE A SEPARATE TS CONFIG FOR ESM!
      declaration: true,
      declarationDir: './dist/esm',
      outDir: './dist/esm',
      rootDir: './src',
      emitDeclarationOnly: false,
      // Below ensures it only emits .d.ts for ESM build
      noEmitOnError: true,
      // If using isolatedModules for Vite compatibility, set it here:
      // isolatedModules: true,
    }),
    resolve({ extensions: ['.js', '.ts', '.jsx', '.tsx'] }),
    postcss({
      extract: true,
      modules: false,
      minimize: false,
      sourceMap: true,
    }),
    terser(),
  ],
  external: ['dockview-core', 'dockview', 'solid-js', 'solid-js/web', 'solid-js/store'],
};
