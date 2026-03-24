<div align="center">
  <h1>DataMorph Playground</h1>
  <p>
    A mobile-friendly, browser-based playground for the <strong>DataMorph</strong> transformation engine.<br>
    Built with <strong>SolidJS</strong>, <strong>@arminmajerie/dockview-solid</strong>, and a Rust/WASM core.
  </p>
</div>

---

## Live Demo

**[https://amkserver.myddns.rocks/DataMorph-Playground](https://amkserver.myddns.rocks/DataMorph-Playground)**

## Source Code

**[https://github.com/arminmajerie/dockview-solid-port](https://github.com/arminmajerie/dockview-solid-port)**

---

## What Is This?

The DataMorph Playground is an interactive, dockable-panel UI that lets you write and run **DataMorph transformation scripts** entirely in the browser. The DataMorph engine is compiled to WebAssembly (WASM) so there is no server-side execution — everything runs locally.

It serves as both a real-world demo of `@arminmajerie/dockview-solid` and a functional scripting environment.

---

## Features

- **Script editor** — Write DataMorph scripts with syntax highlighting (CodeMirror).
- **Input explorer** — Manage multiple named pipeline inputs in JSON, XML, YAML, TEXT, or DML format.
- **Output pane** — View transformation results with automatic pretty-printing.
- **Log viewer** — Inspect execution logs and errors in a dedicated dockable panel.
- **Import / Export** — Save and restore your full playground session as a zip file.
- **Dockable layout** — All panels are resizable and rearrangeable via `@arminmajerie/dockview-solid`.
- **Mobile friendly** — Touch-optimised layout works on phones and tablets.
- **Zero server required** — The DataMorph WASM module runs fully in-browser.

---

## Tech Stack

| Dependency | Purpose |
|---|---|
| `@arminmajerie/dockview-solid` | Dockable panel layout |
| `@arminmajerie/keyboard-manager` | Keyboard context management |
| `data-morph-wasm` | Rust-compiled DataMorph engine (WASM) |
| `solid-js` | Reactive UI framework |
| `@codemirror/*` | Code editor with JSON/XML/YAML/DML support |
| `@suid/material` | Material UI components for SolidJS |
| `jszip` + `file-saver` | Playground import/export |
| `vite` + `vite-plugin-solid` | Build tooling |
| `tailwindcss` | Utility CSS |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```sh
# From the repo root
cd packages/examples/data-morph
npm install
```

### Run (development)

```sh
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Build

```sh
npm run build
```

Output goes to `dist/`.

### Preview built output

```sh
npm run server
```

---

## Configuration

### Custom base path

If you are deploying to a sub-path (e.g. `/DataMorph-Playground/`), set the `VITE_BASE_PATH` environment variable at build time:

```sh
VITE_BASE_PATH=/DataMorph-Playground npm run build
```

---

## Project Structure

```
src/
  App.tsx              # Root layout — SplitView + DockView wiring
  index.tsx            # Entry point
  index.css            # Global styles
  codemirror/          # CodeMirror editor setup and extensions
  header/              # Panel header components
  inputExplorer/       # Input list, script explorer, and data models
  logViewer/           # Log panel and log service
  output/              # Output/result pane
  scriptPane/          # Script editor panel
  svg/                 # SVG icon assets
  topHeader/           # Top app bar / toolbar
  util/                # WASM loader, import/export, pretty-printers
data-morph-wasm/       # Compiled WASM package (wasm-bindgen output)
public/                # Static assets
```

---

## DataMorph WASM

The `data-morph-wasm` folder contains a pre-built `wasm-bindgen` package that wraps the DataMorph Rust engine. All exports return a JSON envelope:

```json
{ "ok": true, "value": "...", "context": { "payloadFormat": "json", "payload": {}, "attributes": {}, "variables": {}, "error": null } }
```

The WASM module is loaded lazily via `src/util/dataMorphWasmLoader.ts`.

---

## License

MIT
