# Edit model: handoff

Branch `enhancement/schema-edit-model`, paused on 2026-10-31. The design discussion showed the map model itself had to change first, so that work moved to its own branch (`enhancement/flat-map-model`). Resume here once it is merged: rebase isn't allowed, so merge `main` into this branch.

## Goal

Define **COM-070 Map edit model**: what a change to a map is, how it applies and how it is undone. It is shared by the daemon (COM-005), the editor (COM-003), the terminal manager (COM-004) and agents (REQ-005).

## State of the map on this branch

- COM-070 stub added (partOf COM-001, folder Schema), no summary yet.
- REQ-009 "Atomic operations" removed from the daemon, replaced by REQ-243 "Atomic changes" on COM-070.
- REQ-243 marked as verifying REQ-008. **To fix:** atomicity supports REQ-003, not REQ-008; REQ-008 should be verified by an "invertible changes" requirement.

## Decided

**Scope.** The edit model defines operations only. Grouping changes for review is a UI concern. Dependencies between operations are inferred and belong to the conflicts discussion.

**Operations.** With the flat map model (see below) there are no list fields left, so the whole set is:

| Target | Operations | Carries |
|---|---|---|
| Item or relationship | `create` | Identity fields: `id`, `type`, and `source`/`target` for relationships |
| Item or relationship | `delete` | A full copy, for the inverse |
| Field | `set` / `unset` | The value before and after |
| Map's own fields | `set` / `unset` | Same; the map is never created or deleted |

- Objects (type expressions, test configs) are atomic values, edited whole.
- Revert of a multi-step edit runs each step's inverse in reverse order.

**Map model changes**, now on `enhancement/flat-map-model`:

- Two top-level collections, `items` and `relationships`; every reference outside an atomic value is a relationship.
- Specs, steps, decision options, interface inputs/outputs and statements become items.
- Fields are either identity (required, no default) or optional; the UI shows placeholders for missing ones.
- Orderability is a property of the relationship type; `position` is an optional fractional key, never rebalanced.
- Mockup `content` is a resource id or inline HTML.
- `type` can't change (D-002 wording to fix).
- No type registry and no per-type versions: everything is versioned with `schemaVersion`.

## Still to do here

1. **Conflicts.** What counts as a conflict, how it is detected (expected values on `set`, full copy on `delete`), how it is resolved. Recommended so far: reject a stale operation rather than last-writer-wins, matching REQ-016's keep mine / take theirs.
2. **Dependencies.** Inferring which operations depend on others; transactions (one edit, several sequential steps); cascading deletes of dependent items (options, steps, statements); a delete whose target has already vanished.
3. **Write COM-070's requirements** from the decisions above, and rewrite REQ-243.
4. **Daemon cleanup.** REQ-011, REQ-012 and REQ-014 describe an operation's shape inline; point them at COM-070.
5. **Relations.** COM-070 depends on COM-016; COM-005, COM-003 and COM-004 depend on COM-070.
6. **Implementation**, later: a lib under `src/libs/map/` with the change schema and pure functions to apply a change, invert it and diff two maps into changes (needed by REQ-014).

## TODO, out of scope

- Keep entities of unknown types untouched (extensibility).
- Type versions and migrations (extensibility).
