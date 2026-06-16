# AI agent instructions (dockview-solid-port)

## Package manager (NON-NEGOTIABLE)

- Use **npm** in this repository.
- `preinstall` blocks npm with an error message.
- Install: `npm install` from this directory.
- Scripts: `npm run build`, `npm run dev:example`, `npm run test:unit`, etc.
- See repo root `.github/package-manager-policy.md` for workspace-wide policy.

## Why npm

This monorepo uses npm workspaces.

## After editing workspace packages

Re-run `npm install` after changing `@arminmajerie/*` packages in `packages/`.
