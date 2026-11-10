# Pjama

## Scripts

Run these pnpm scripts rather than calling the tools behind them directly.

| Script | Runs |
|---|---|
| `pnpm run typecheck` | `nx run-many -t typecheck`: typechecks each project's source and tests. |
| `pnpm run lint` | `biome check --write --unsafe`: lints, formats and sorts imports, applying all fixes, unsafe ones included. |
| `pnpm test` | `typecheck`, then `lint`, then `nx run-many -t test`. Stops at the first failure. |
| `pnpm run build` | `typecheck`, then `lint`, then `nx run-many -t build`. Stops at the first failure. |
| `pnpm run storybook` | `storybook dev --port 6006` in the editor: serves its stories until stopped. |
| `pnpm run editor:start [port]` | Starts the projMap editor in the background on `.projMap/projMap.json`, on port 4319 unless given, and prints its URL. |
| `pnpm run editor:stop [port]` | Stops the projMap editor on that port. Stop it before switching git branches: it reloads the map from the new branch and rewrites `projMap.layout.json`. |

Every story (`*.stories.tsx`) also runs as a screenshot test. Stories and `*.screenshot.test.tsx` files run in headless Chromium through Playwright: install it once with `pnpm --filter editor exec playwright install chromium`. A missing baseline fails the run and is written to `__screenshots__/`: look at it before committing it.

## Workspace

An Nx monorepo on pnpm workspaces. Apps live in `src/apps/`, libraries in `src/libs/`, repo scripts in `src/scripts/`, one folder per project, each with its own `package.json`. Nx runs the `typecheck`, `test` and `build` scripts each project defines; Biome lints the whole repo from the root.

Each project declares the dependencies it imports: add them with `pnpm --filter <project> add <package>`.

`lint`, `test` and `build` rewrite files when Biome finds something to fix. Review the diff after running them.
