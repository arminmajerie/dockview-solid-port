<div align="center">
<h1>dockview</h1>

<p>Zero dependency layout manager supporting tabs, groups, grids and splitviews. Supports Solid.js and Vanilla TypeScript</p>

</div>

---

[![npm version](https://badge.fury.io/js/dockview-core.svg)](https://www.npmjs.com/package/dockview-core)
[![npm](https://img.shields.io/npm/dm/dockview-core)](https://www.npmjs.com/package/dockview-core)
[![CI Build](https://github.com/mathuo/dockview/workflows/CI/badge.svg)](https://github.com/mathuo/dockview/actions?query=workflow%3ACI)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=mathuo_dockview&metric=coverage)](https://sonarcloud.io/summary/overall?id=mathuo_dockview)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=mathuo_dockview&metric=alert_status)](https://sonarcloud.io/summary/overall?id=mathuo_dockview)
[![Bundle Phobia](https://badgen.net/bundlephobia/minzip/dockview-core)](https://bundlephobia.com/result?p=dockview-core)

##<div align="center">
  <h1>dockview-solid-port</h1>
  <p>
    Zero-dependency layout manager for <strong>SolidJS</strong>.<br>
    <b>No React. No Vue. No legacy code.</b>
  </p>
</div>

---

**This package is for SolidJS.
It is NOT based on `solid-dockview` (outdated) or `dockview-solid` (React-dependent).**

---

## Why this repo?

* `solid-dockview` ([lyonbot/solid-dockview](https://github.com/lyonbot/solid-dockview)): Outdated, not compatible, unmaintained.
* `dockview-solid` ([mathuo/dockview/tree/main/packages/dockview-solid](https://github.com/mathuo/dockview/tree/main/packages/dockview-solid)): Thin React wrapper, **still requires React**.

**`dockview-solid-port`:**

* ✅ Directly ported from [mathuo/dockview](https://github.com/mathuo/dockview)
* ✅ 100% SolidJS (no React dependency, no React shims)
* ✅ Works in SolidJS + Tauri applications

---

## Features

* Tabs, groups, grids, splitviews
* Drag-and-drop with customizable drop zones
* Floating groups and popout windows
* Serialization/deserialization for state persistence
* Theme system (CSS custom properties)
* Full API for programmatic control
* Works natively in SolidJS and Tauri
* No React or legacy code

---

## Installation

Clone and set up:

```sh
git clone https://github.com/arminmajerie/dockview-solid-port.git
cd dockview-solid-port
npm install
# Install dependencies in each sub-package:
cd packages/dockview-core && npm install
cd ../dockview && npm install
cd ../dockview-solid && npm install
cd ../../
npm run rebuild
```

---

## Usage

In your SolidJS project:

```js
import { DockviewSolid } from "dockview-solid-port";

// Example usage coming soon
```

*See the docs directory for further instructions (work in progress).*

---

## Project status

* **Alpha:** Major features are ported, but expect bugs and breaking changes.
* **Docs and live examples:** Coming soon.
* **No support for React/Vue.**

---

## License

MIT

---

## Maintainer

* [arminmajerie](https://github.com/arminmajerie)
