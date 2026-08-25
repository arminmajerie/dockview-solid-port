import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

const exampleTarget = 'esnext';

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: exampleTarget,
  },
  ssr: {
    noExternal: [
      // Ensures Solid's JSX transform is applied even during dev/SSR
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ]
  },
  optimizeDeps: {
    esbuildOptions: {
      // Vite 6's dep pre-bundler still defaults to an older modules target
      // that triggers esbuild 0.28.x destructuring failures in modern deps.
      target: exampleTarget,
      supported: {
        destructuring: true,
      },
    },
    // Prevents Vite from "pre-bundling" these as plain JS (keeps them in .jsx)
    exclude: [
      'solid-js',
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
});
