import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  target: 'esnext',
  external: ['solid-js', 'solid-js/web', 'dockview-core'],
  esbuildOptions(options) {
    options.jsx = 'preserve';
    options.jsxImportSource = 'solid-js';
  },
});
