# TODO

## To refine

- [ ] **Notifications for incoming changes.** Read/unread mechanic: changes a user hasn't seen stay marked and roll up (item → component → tree/graph), listed in a notifications section where they can be marked as seen. Implementation TBD.
- [ ] **Change sets.** Group an author's related operations (e.g. an agent's work on one task) under one id and message, shown as a single entry and revertible as a whole. To define: how the grouping works and how agents open and close a set.
- [ ] **Change rendering.** How each kind of change is displayed (text fields, references, deletions, moves, use case steps), both in place and in the notifications section.

- [ ] **Component properties in the map model.** `depth`, `level` and `sourceLocation` are used in `.projMap` but are not specified in Pjama's map model (COM-016), so the map schema (COM-032) leaves them out for now. Decide which ones to keep, specify them, and add them to the schema. (`technologies` became a spec type, COM-060.)
- [ ] **Importing files from outside the project.** When a user adds a resource from a file outside the project, the editor (COM-003) asks where in the project to put a copy, defaulting to `.pjama/assets/`, and links the resource to the copy (D-005). To define: the flow, the default file name, and what happens on name clashes.
- [ ] **Conditions and parallel branches in use cases.** Use case branches currently act as alternative flows, with no condition stating when each one applies. Develop branch conditions, and parallel branches where more sequences happen at once.

## Out of scope for now

- [ ] **Explore linting/correctness checks driven by component qualifiers.** `depth` (and possibly a qualifier like logical / deliverable / code) currently carries no rules. If those values become more defined, a linter could raise advisory warnings rather than schema errors, e.g. "code component has no `sourceLocation`", "deliverable distributes nothing", "low-level component has no requirements". Decide which qualifiers get a fixed vocabulary and which checks are worth having, without making the tool rigid for users.

- [ ] **Better understand how conventions fit the model, to consider implementing them in the future.** Not enough real-world use yet to decide. Insights so far:
  - *Current lean:* the map acts as the implicit root and holds its own `specs`. A convention is a requirement there (e.g. `category: "convention"`), linked to a resource such as the skill or doc that defines it. No dedicated spec type yet.
  - *Real gap: partial application.* Most conventions apply to only part of the map ("all TypeScript code, not docs"). Options to evaluate: an `appliesTo` filter on the requirement (by depth, tech, path glob, …); a logical component that the affected components are `partOf`; explicit per-component links. Folders should **not** carry specs, or they turn back into containment.
  - *Convention vs implementation blur.* A linter config or the skill defining the code conventions is both a convention and a thing that exists in the repo. One possible split: the convention stays a requirement, and the artifact is a component (or resource) that enforces it. That would suggest letting `verifiedBy` point to components/resources, not only tests and requirements.
  - *Open:* is elevating a convention to a component ever right? Current test: "can you point to a thing that runs, ships, or exists as code?" The blur above makes that test fuzzy.

- [ ] **Explore the different "times" of a system: logical, build, runtime, deployment.** A map holds a single view, and the user or agent drawing it chooses how to structure the components. But the same pair can relate differently depending on the time: a vendored library is a dependency in the design but inside the app at build time, a microservice is part of a subsystem logically but runs on a cluster shared with other subsystems. Worth exploring whether these times bring their own behaviours, and how they could coexist with a single-view map. See the spec sharing model in [docs/model-definitions-and-capabilities.md](docs/model-definitions-and-capabilities.md).

- [ ] **Variants with the same children.** A component can have a variant that must keep the same children as the original, possibly with some of them changed. This brings its own set of behaviours and will be explored separately. See [docs/model-definitions-and-capabilities.md](docs/model-definitions-and-capabilities.md).


- moving specs across components
- verified specs visible from the spec card
- copy/paste/duplication spec options
- movable spec cards

- [ ] Make the files written by the editor compatible with formatters like biome, prettier and eslint