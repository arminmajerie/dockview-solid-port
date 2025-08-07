import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'DockviewSolid',
      fileName: format => `dockview-solid.${format}.js`,  // solid.es.js & solid.cjs.js (if desired)
      formats: ['es']  // specify multiple formats if needed
    },
    rollupOptions: {
      external: ['solid-js', 'solid-js/web', 'dockview-core']
    }
  }
});
