import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import wasm from 'vite-plugin-wasm';
import { fileURLToPath } from 'node:url';
import { workspacePackageAliases } from '../../../scripts/workspace-aliases.mjs';

const exampleRoot = fileURLToPath(new URL('.', import.meta.url));
const configuredBasePath = process.env.VITE_BASE_PATH?.trim() ?? '/';
const normalizedBasePath = configuredBasePath === '/'
  ? '/'
  : `/${configuredBasePath.replace(/^\/+|\/+$/g, '')}/`;
const exampleTarget = 'esnext';

export default defineConfig({
  base: normalizedBasePath,
  plugins: [solidPlugin(), tailwindcss(), wasm()],
  server: {
    port: 3000,
    fs: {
      allow: [exampleRoot],
    },
  },
  build: {
    target: exampleTarget,
    rollupOptions: {
      treeshake: {
        correctVarValueBeforeDeclaration: true,
      },
    },
  },
  ssr: {
    noExternal: [
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core',
      '@codemirror/autocomplete',
      '@codemirror/commands',
      '@codemirror/lang-json',
      '@codemirror/lang-xml',
      '@codemirror/lang-yaml',
      '@codemirror/language',
      '@codemirror/lint',
      '@codemirror/state',
      '@codemirror/theme-one-dark',
      '@codemirror/view'
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
    exclude: [
      'solid-js',
      '@arminmajerie/dockview-solid',
      '@arminmajerie/dockview-core',
      '@codemirror/autocomplete',
      '@codemirror/commands',
      '@codemirror/lang-json',
      '@codemirror/lang-xml',
      '@codemirror/lang-yaml',
      '@codemirror/language',
      '@codemirror/lint',
      '@codemirror/state',
      '@codemirror/theme-one-dark',
      '@codemirror/view'
    ],
  },
  resolve: {
    dedupe: [
      'solid-js',
      'solid-js/web',
      'solid-js/store',
      '@suid/material',
      '@suid/base',
      '@suid/system',
      '@suid/styled-engine',
      '@suid/utils',
      '@suid/types',
    ],
    alias: {
      ...workspacePackageAliases(exampleRoot),
      'data-morph-wasm': '@arminmajerie/data-morph-wasm',
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
  }
});
