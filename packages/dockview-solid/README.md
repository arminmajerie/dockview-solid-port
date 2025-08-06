<div align="center">
  <h1>@arminmajerie/dockview-solid</h1>
  <p>
    Zero-dependency layout manager for <strong>SolidJS</strong>.<br>
    <b>No React. No Vue. No legacy code.</b>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/@arminmajerie/dockview-solid">
      <img src="https://img.shields.io/npm/v/@arminmajerie/dockview-solid?logo=npm" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/@arminmajerie/dockview-solid">
      <img src="https://img.shields.io/npm/dm/@arminmajerie/dockview-solid.svg" alt="npm downloads">
    </a>
  </p>
</div>

---

**This package is for SolidJS.**
It is NOT based on `solid-dockview` (outdated) or the React-dependent `dockview-solid` from mathuo/dockview.

---

## Why this repo?

* `solid-dockview` ([lyonbot/solid-dockview](https://github.com/lyonbot/solid-dockview)): Outdated, not compatible, unmaintained.
* `dockview-solid` ([mathuo/dockview/tree/main/packages/dockview-solid](https://github.com/mathuo/dockview/tree/main/packages/dockview-solid)): Thin React wrapper, **still requires React**.

**`@arminmajerie/dockview-solid`:**

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

```sh
npm install @arminmajerie/dockview-solid dockview-core solid-js
```

Both `@arminmajerie/dockview-solid` and `dockview-core` are required.

---

## Usage

```js
import "dockview-core/dist/styles/dockview.css";
import {
  DockviewSolid,
  DockviewApi,
  IDockviewPanelProps,
  IDockviewPanelHeaderProps,
  IDockviewHeaderActionsProps,
  IWatermarkPanelProps,
  DockviewReadyEvent,
  IDockviewPanel,
  themeReplit
} from "@arminmajerie/dockview-solid";

// Example component usage:

<DockviewSolid
  theme={themeReplit}
  components={{ panelContent: PanelContent }}
  tabComponents={{
    customTabHeaderWorkspace: CustomTabHeaderWithCloseButton,
    customTabHeaderConfig: CustomTabHeaderWithCloseButton,
    customTabHeaderComponent: CustomTabHeaderWithCloseButton,
    customTabHeaderCanvas: CustomTabHeaderNoClosing,
  }}
  rightHeaderActionsComponent={AddPanel}
  watermarkComponent={MyWatermark}
  onReady={handleReady}
/>
```

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
