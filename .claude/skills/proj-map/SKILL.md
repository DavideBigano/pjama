---
name: proj-map
description: Create, read, or edit the project's map at $repoRoot/.projMap/projMap.json — a JSON graph of the project's components, their containment and dependencies, and the requirements, use cases, interfaces, actors, resources, tests, and decisions attached to them. Use whenever the user wants to document, inspect, or update project/system/service architecture, requirements docs, use cases, actor roles, interfaces/APIs, component diagrams, dependencies, or asks about "projMap", "project map", "component graph", "architecture map", or similar structural/requirements documentation.
skillmancy-version: "0.2.0"
---

# Proj Map

Read [projMap.schema.json](./references/projMap.schema.json). Use it as a base to create, read, edit the `$repoRoot/.projMap/projMap.json` file. The schema and its descriptions are the source of truth for structure and meaning.

`projMap.json` aims to describe the project stored in the current repo with the granularity preferred by the user.

You may use json schema validation libraries to assert the correct structure of the file. Some constraints stated in the schema's descriptions can't be enforced by JSON Schema (uniqueness of ids, absence of cycles, ...): verify them yourself on every edit, along with every referenced id existing in its list.

## Editor

When the user wants to browse or edit the map visually, start the bundled editor (Node 22+, no install or build needed) as a background process:

```sh
node .claude/skills/proj-map/editor/server.js [path/to/projMap.json] [--port 4319] [--root DIR] [--open]
```

- The map defaults to `.projMap/projMap.json` under the current directory. Run from `$repoRoot` or pass the path. If the file is missing, the editor opens a blank map and the first save creates it.
- It prints the URL (`http://127.0.0.1:<port>/`, moving to the next free port if busy); give it to the user, or pass `--open` to open their browser.
- Resource locations resolve against `--root`, which defaults to the folder holding `.projMap`, so image previews work for repo-relative paths.
- Only the user's Save writes `projMap.json`. Node positions in the graph go to `projMap.layout.json` next to it; that file is editor state, not part of the map.
- You can keep editing the file while the editor runs: it reloads on its own when the user has no unsaved changes, and asks them whether to reload or overwrite otherwise. Re-read the file after the user says they're done.
- Tests: `node --test` from the `editor` folder.

## Choosing where things go

- **Part of, or depends on?** Use `partOf` only when the parent's requirements really should apply to the child; otherwise use a relation. Something that packages or ships a component (a plugin, an installer) usually `distributes` it rather than containing it.
- **Organizing only?** If a component needs a place to sit but no parent's requirements apply to it, put it in a folder or leave it without a parent. Don't add `partOf` just to group things.
- **Third-party specs.** When a relation relies on a spec owned by neither of its components (e.g. a shared data format), check whether an edge is missing before keeping it.
- **Caller-specific contracts.** When a component offers different guarantees to different callers (e.g. read-only for one, read-write for another), model them as separate interfaces or requirements and have each relation rely on the right one.

## Some suggestions

- Keep implementation details in the requirements low to none for high-level components and make them more granular the closer you are to code.
- Requirements of lower-level components don't necessarily need to derive from higher-level requirements (a requirement for a library may mention implementation details not covered by any higher-level requirement). It is still important that requirements don't contradict each other, including the ones a component inherits through `partOf`.
