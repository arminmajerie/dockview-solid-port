import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import {
  assertWorkspaceFile,
  workspacePackageAliases,
} from '../../scripts/workspace-aliases.mjs';

const packageDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: 'assert-workspace-dockview-css',
      buildStart() {
        assertWorkspaceFile(
          packageDir,
          '@arminmajerie/dockview',
          'dist/styles/dockview.css'
        );
      },
    },
    solidPlugin(),
  ],
  resolve: {
    alias: workspacePackageAliases(packageDir),
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'DockviewSolid',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      external: ['solid-js', 'dockview-core', '@arminmajerie/dockview'],
      output: {
        exports: 'named',
      },
    },
  },
});
