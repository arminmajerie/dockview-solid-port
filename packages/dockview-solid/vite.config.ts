import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  build: {
    lib: {
      entry: "src/index.ts",
      name: "DockviewSolid",
      fileName: "index",
      formats: ["es", "cjs"]
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: [
        "solid-js",
        "dockview-core",
        "@arminmajerie/dockview"
      ],
      output: {
        exports: "named"
      }
    }
  }
});
