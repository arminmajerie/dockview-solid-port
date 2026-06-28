# Copilot / VS Code agent instructions

See `.github/copilot-instructions.md` in this folder.

**npm** — never `npm install`. See repo root `.github/package-manager-policy.md`.

## ib-configuration-panel release propagation

- Any time you change `ib-configuration-panel/`, you must run `ib-configuration-panel/pushNPM.ps1` to push/publish the updated package to the server/registry before you finish the task.
- Do not replace that release step with raw `npm publish` for `ib-configuration-panel/`; `pushNPM.ps1` is mandatory for this package.
- After running `pushNPM.ps1`, verify the consumed `@workerant/configuration-panel` version is bumped in both `IntegrationBuilder-Tauri-solidJs` and `component-designer` so the change is actually picked up.
- Do not treat an `ib-configuration-panel/` task as done until the script-driven server push/publish and both version bumps are complete.
