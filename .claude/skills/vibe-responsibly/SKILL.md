---
name: vibe-responsibly
description: Coding conventions to apply when implementing a spec or request for a piece of code/software. Applies testability/pure-function/naming/JSDoc conventions, TypeScript/npm/Vite/Vitest project setup, build output layout, and four-tier test conventions (unit/integration/e2e/screenshot). Invoke explicitly via /vibe-responsibly when handing off a spec — not auto-triggered.
user-invocable: true
skillmancy-version: "0.2.0"
---

# vibe responsibly

## Authorities

**Robert C. Martin** gave you your clarity discipline: code should read as prose good enough that comments become unnecessary — small, single-purpose, declaratively-named functions, with a comment only where the code itself cannot carry the explanation (e.g. non-obvious bit operations).

**Kent C. Dodds** gave you your testing philosophy: tests live next to the code they cover, exercise one behavior at a time, and are written for confidence — testability and mockability are properties designed into the code from the start, not bolted on after.

You work implementation-first: given a spec, you write production code that is honest about its own boundaries — pure where possible, self-explanatory by default, and tested at the layer(s) that actually apply.

---

## Guidelines

**Be direct, not diplomatic** — Say what needs to be said, clearly and with reason. Pushback is not a reflex: if a choice is well-reasoned and the tradeoffs are understood, say so and move forward. (Yes: ["This function does three unrelated things — split it before it's testable"] / No: ["That's fine, maybe consider splitting it later"])

**Keep it light** — This is meant to be a short, reusable set of defaults, not a review gate. Apply the conventions while writing the code; don't turn every convention into its own back-and-forth with the user.

---

## Task

Write implementation and tests applying the conventions in Resources.
If mid-implementation something arises that these conventions or the spec don't cover, stop and ask.

---

## Resources

### Project conventions

TypeScript, set up as an npm project. Vite builds the project; Vitest runs the tests. Source lives in `src/`, build output in `dist/`, bundled as a single output file with third-party dependencies included.

### Code conventions

**Testability and mockability** — Design functions to be easy to test and mock in isolation: inject dependencies rather than reaching for globals, keep side effects at the edges.

**Pure functions preferred** — Where the logic allows it, prefer pure functions (same input, same output, no side effect) over stateful ones.

**Declarative naming** — Function names state what they do, not how. Prefixes currently in use: `get` for retrieval, `create` for factories, `is`/`can` for booleans, `find` for searches that may come up empty, `open` for UI that opens a popover, menu or dialog — more will be added over time; use a plain declarative name when nothing listed fits. Flag possible new prefixes to the user when you find one.

**JSDoc and comments** — Every function gets a short, explicative JSDoc for its human consumers. Beyond that, comment only when the code itself can't carry the explanation (e.g. low-level bit operations) — otherwise let the code read clearly enough that it doesn't need one.

**Modern idioms** — Use modern TS/JS APIs, libraries and idioms.

### React conventions

**Functional components** — Use functional components, never class components.

**CSS Modules** — Style components with CSS Modules.

**Same conventions apply, except naming** — Treat a component like any other function: testability/mockability, purity where possible, JSDoc over comments, modern idioms. All apply except naming: use PascalCase; no `get`/`create` prefixes.

**Elements vs components** — Two tiers, decide which one each piece of UI is before building it. The main driver is reuse, not size or state — a stub with no state or behavior is still a component if it's bespoke to one place (e.g. a placeholder tab screen), not an element just because it's simple:
- **Elements** — reused across the app. Small state, generally injected via props rather than owned.
- **Components** — bespoke, used in one place. Bigger state, a mix of self-contained (internal) and injected state.

**Folder layout** — Two top-level folders, `components/` and `elements/`, one per tier. Inside each, one folder per component/element named after it (PascalCase), colocating the component with all of its tests (see Testing conventions) and its `__snapshots__/`/`__screenshots__` directory (depending on the library used):
```
components/
    Component/
        Component.tsx
        Component.screenshot.test.tsx
        Component.test.tsx
        __snapshots__/ (or __screenshots__/)
            ...
elements/
    Element/
        Element.tsx
        Element.screenshot.test.tsx
        Element.test.tsx
        Component.test.tsx
        __snapshots__/ (or __screenshots__/)
            ...
```

### Testing conventions

**Three tiers, colocated** — `file.ts` pairs with `file.test.ts` (unit), `file.integration.test.ts` (integration, when applicable), and `file.e2e.test.ts` (e2e, when applicable). Colocate all three with the code under test where feasible — straightforward for unit tests, apply the same pattern to integration/e2e whenever it's practical.

**`test`, not `it`** — Use Vitest's `test()` API, not `it()`.

**One assertion per test** — Unless one assertion is a precondition for another (e.g. an `isDefined` guard before the assertion that depends on it), keep each test to a single assertion.

**Cover both directions** — Test both for the expected output, and for the regressions you want to guard against.

**Minimize abstractions** — Default to duplicating setup and assertions across tests; write each test as if it were the only one. Abstract only when: (1) a pattern repeats across multiple test suites — extract it to a shared test-util function or a custom Vitest matcher; (2) a suite has more than a couple of tests and the pattern repeats across most of them — turn it into a function, scoped to where the repetition lives (inside the `describe` block if local to it, at module level if it spans the whole file); (3) a function is tested against multiple inputs — use `test.each`/`describe.each`. Always ask for user approval before committing to a test abstraction.

**Behavior vs graphical concerns** — For UI code, split what's tested by kind, not by file-under-test: behavior (state transitions, handlers, logic) belongs in classic unit tests (`file.test.ts`); anything graphical (position, presence, correctness of rendered text) belongs in screenshot/snapshot tests (`file.screenshot.test.ts`). Don't assert layout or rendered text inside a `file.test.ts`, and don't assert behavior inside a `file.screenshot.test.ts`.

**`file.screenshot.test.ts`** — Fourth colocated tier, alongside unit/integration/e2e, covering both literal screenshots and text/frame snapshots (e.g. `lastFrame()` from `ink-testing-library`). Same colocation rule as the other tiers.
