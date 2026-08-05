# Dockview Solid customization lab

This example is intentionally excessive. It demonstrates how much of a Dockview layout can be changed without modifying Dockview itself.

## Run it

Run commands from the `dockview-solid-port` workspace root:

```bash
npm install
npm run dev:example
```

Open `http://127.0.0.1:4173`.

## What is customized

- Runtime panel width and height through `panel.api.setSize(...)`
- Per-panel minimum and maximum width/height constraints
- Layout presets that resize several groups together
- Theme gap through `api.updateOptions({ theme })`
- Panel, group, tab, header, sash, drag overlay, and floating-window CSS
- Live corner radius, header height, spacing, and color palettes
- Fully custom Solid tab renderers with icons, badges, dirty state, locks, and selective close buttons
- Custom group-level header actions
- Multiple tabs in one group
- Close and restore behavior
- Floating and maximized groups
- A custom empty-workspace watermark

The implementation is mainly in:

- `src/App.tsx` for renderers, API calls, constraints, and layout behavior
- `src/index.css` for the visual system and Dockview CSS hooks

## Practical limits

Public APIs control layout structure and geometry. CSS controls nearly all visual chrome. Custom renderers control tab, panel, header-action, and watermark markup.

The layout remains a rectangular split grid: individual docked groups cannot overlap or use arbitrary non-rectangular geometry. Floating groups can overlap. Replacing drag/drop rules, grid mathematics, serialization, or sash behavior would require changes in `dockview-core`.

No Dockview package changes were required for this lab. Because this repository is an npm workspace, the example resolves the local `@arminmajerie/dockview-solid` workspace automatically; a `file:` dependency is not needed here.
