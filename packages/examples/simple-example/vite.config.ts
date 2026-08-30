import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { fileURLToPath } from 'node:url';
import { workspacePackageAliases } from '../../../scripts/workspace-aliases.mjs';

const exampleRoot = fileURLToPath(new URL('.', import.meta.url));
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
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ]
  },
  optimizeDeps: {
    esbuildOptions: {
      target: exampleTarget,
      supported: {
        destructuring: true,
      },
    },
    exclude: [
      'solid-js',
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core'
    ],
  },
  resolve: {
    alias: workspacePackageAliases(exampleRoot),
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
});
