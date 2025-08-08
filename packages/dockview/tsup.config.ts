// packages/dockview/tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  minify: false,
  clean: true,
  splitting: false,
  esbuildOptions(options) {
    options.jsx = 'preserve';
    options.jsxFactory = 'jsx';
    options.jsxFragment = 'Fragment';
    options.jsxImportSource = 'solid-js';
  },
  external: [
    'solid-js', 'solid-js/web', '@arminmajerie/dockview-core'
  ],
});
