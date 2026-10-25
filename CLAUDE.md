# Pjama

## Scripts

Run these pnpm scripts rather than calling the tools behind them directly.

| Script | Runs |
|---|---|
| `pnpm run typecheck` | `nx run-many -t typecheck`: typechecks each project's source and tests. |
| `pnpm run lint` | `biome check --write --unsafe`: lints, formats and sorts imports, applying all fixes, unsafe ones included. |
| `pnpm test` | `typecheck`, then `lint`, then `nx run-many -t test`. Stops at the first failure. |
| `pnpm run build` | `typecheck`, then `lint`, then `nx run-many -t build`. Stops at the first failure. |

Scripts run once and exit: there is no watch mode.

## Workspace

An Nx monorepo on pnpm workspaces. Apps live in `src/apps/`, libraries in `src/libs/`, one folder per project, each with its own `package.json`. Nx runs the `typecheck`, `test` and `build` scripts each project defines; Biome lints the whole repo from the root.

Each project declares the dependencies it imports: add them with `pnpm --filter <project> add <package>`.

`lint`, `test` and `build` rewrite files when Biome finds something to fix. Review the diff after running them.
