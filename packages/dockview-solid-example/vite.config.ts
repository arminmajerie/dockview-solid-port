import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
  ssr: {
    noExternal: [
      // Ensures Solid's JSX transform is applied even during dev/SSR
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ]
  },
  optimizeDeps: {
    // Prevents Vite from "pre-bundling" these as plain JS (keeps them in .jsx)
    exclude: [
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
});
