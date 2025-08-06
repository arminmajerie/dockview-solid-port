# CLAUDE.md

This file provides guidance for AI code assistants and contributors working with the `dockview-solid-port` repository.

## Project Overview

* **dockview-solid-port** is a modern, zero-dependency layout manager for SolidJS, supporting tabs, groups, grids, and splitviews.
* **Not based on:** [solid-dockview](https://github.com/lyonbot/solid-dockview) (outdated) or [dockview-solid](https://github.com/mathuo/dockview/tree/main/packages/dockview-solid) (React-dependent).
* **Direct port of:** [mathuo/dockview](https://github.com/mathuo/dockview) with all React code removed, fully adapted for SolidJS (works well in SolidJS-native environments like Tauri).

## Monorepo Structure

* `packages/dockview-core` – Core layout engine (framework-agnostic)
* `packages/dockview` – SolidJS dockview implementation (core dock layout + bindings, no React code)
* `packages/dockview-solid` – **SolidJS implementation (use this!)**
* `packages/docs` – Documentation website (in progress)

## Development Workflow

**Initial setup (must do in root AND each package):**

```sh
npm install
cd packages/dockview-core && npm install
cd ../dockview && npm install
cd ../dockview-solid && npm install
cd ../../
```

**To rebuild all packages:**

```sh
npm run rebuild:all
```

> `rebuild:all` requires each package’s node\_modules to be present.
> If you get build errors, run `npm install` in each package again.

**Cleaning:**

```sh
npm run clean
```

## Key Development Notes

* Always build `dockview-core` before other packages.
* No React code or dependencies in `dockview-solid`.
* Testing is currently limited; expand test coverage if you contribute.
* Do not use or copy code from `solid-dockview` or `dockview-solid` (React version). This is a direct port.

## FAQ

**Q:** Why so many manual npm installs?
**A:** Upstream monorepo quirks. Don’t skip them or `rebuild:all` will fail.

**Q:** Can I use this in React or Vue?
**A:** No. Use original [mathuo/dockview](https://github.com/mathuo/dockview) for React/Vue. This repo is only for SolidJS.

**Q:** Who maintains this fork?
**A:** [arminmajerie](https://github.com/arminmajerie)

---

*For questions, open an issue on GitHub or ping [arminmajerie](https://github.com/arminmajerie).*
