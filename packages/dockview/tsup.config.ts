import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  clean: true,
  format: ['esm', 'cjs'],   // Add cjs if you're building both
  dts: true,
  target: 'esnext',
  external: ['solid-js', 'solid-js/web', 'dockview-core'],
});
