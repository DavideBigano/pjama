# Pjama

## Scripts

Run these npm scripts rather than calling the tools behind them directly.

| Script | Runs |
|---|---|
| `npm run typecheck` | `tsc --noEmit`: typechecks source and tests. |
| `npm run lint` | `biome check --write --unsafe`: lints, formats and sorts imports, applying all fixes, unsafe ones included. |
| `npm test` | `typecheck`, then `lint`, then `vitest run`. Stops at the first failure. |
| `npm run build` | `typecheck`, then `lint`, then `vite build`. Stops at the first failure. |

Scripts run once and exit: there is no watch mode.

`lint`, `test` and `build` rewrite files when Biome finds something to fix. Review the diff after running them.
