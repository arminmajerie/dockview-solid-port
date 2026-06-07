# AI agent instructions (dockview-solid-port)

## Package manager (NON-NEGOTIABLE)

- **pnpm only.** Never run `npm install`, `npm ci`, or `npm i` in this repository.
- `preinstall` blocks npm with an error message.
- Install: `corepack enable` then `pnpm install` from this directory.
- Scripts: `pnpm run build`, `pnpm run dev:example`, `pnpm run test:unit`, etc.
- See repo root `.github/package-manager-policy.md` for workspace-wide policy.

## Why pnpm

This monorepo is on **exFAT**, which does not support symlinks. npm workspaces fail with `EISDIR`. pnpm uses `node-linker=hoisted` and `package-import-method=copy` (see `.npmrc`).

## After editing workspace packages

Copied workspace deps do not auto-update like symlinks. Re-run `pnpm install` after changing `@arminmajerie/*` packages in `packages/`.
