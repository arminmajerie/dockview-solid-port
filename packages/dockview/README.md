<div align="center">
  <h1>@arminmajerie/dockview</h1>
  <p>
    Zero dependency layout manager supporting tabs, groups, grids and splitviews.<br>
    <b>Now rewritten in SolidJS.</b>
  </p>
  <p>
    <a href="https://www.npmjs.com/package/@arminmajerie/dockview">
      <img src="https://img.shields.io/npm/v/@arminmajerie/dockview?logo=npm" alt="npm version">
    </a>
    <a href="https://www.npmjs.com/package/@arminmajerie/dockview">
      <img src="https://img.shields.io/npm/dm/@arminmajerie/dockview.svg" alt="npm downloads">
    </a>
  </p>
</div>

---

**This package is for SolidJS. Previously implemented in React, it is now a pure SolidJS layout manager.**

---

## Features

* Serialization / deserialization with full layout management
* Support for split-views, grid-views and 'dockable' views
* Themeable and customizable
* Tab and Group docking / Drag n' Drop
* Popout Windows
* Floating Groups
* Extensive API
* Supports Shadow DOMs
* High test coverage
* Documentation website with live examples
* Transparent builds and Code Analysis
* Security in mind: verified publishing and builds through GitHub Actions

---

## Quick Start

Dockview has a peer dependency on `solid-js >= 1.9.7`. You can install dockview from [npm](https://www.npmjs.com/package/@arminmajerie/dockview).

```sh
npm install --save @arminmajerie/dockview solid-js
```

Within your project, you must import or reference the stylesheet at `dockview/dist/styles/dockview.css` and attach a theme.

```css
import "dockview-core/dist/styles/dockview.css";
```

You should also attach a dockview theme to an element containing your components. For example:

```html
<body class="dockview-theme-dark"></body>
```

---

## Maintainer

* [arminmajerie](https://github.com/arminmajerie)

---

MIT License
