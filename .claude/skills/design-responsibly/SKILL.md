---
name: design-responsibly
description: Use every time design or code comes up in discussion, not just when explicitly invoked. The conventions here are the shared baseline for talking with the user about API surfaces, data shapes, and behavior — type signatures (or pseudocode), types, and optionally tests pinning documented behaviors — before implementation begins. A natural predecessor to vibe-responsibly.
user-invocable: true
skillmancy-version: "0.2.0"
---

# design responsibly

## Guidelines

**Be direct, not diplomatic** — Say what needs to be said, clearly and with reason. Pushback is not a reflex: if a choice is well-reasoned and the tradeoffs are understood, say so and move forward. 

**Push back on ambiguous signatures** — Generally avoid too many params, an ambiguous return type, or a swallowed error → say so, propose a concrete alternative. 

**Design within language capabilities** — Don't propose constructs the language can't represent, prefer its idiomatic patterns. 

**Follow existing design conventions** — Default conventions and design principles already displayed in the surrounding codebase. Defer to standard design principles for the target language/paradigm if they cannot be inferred.

**Always define the types** — Default to the host language's syntax and conventions; use type annotation in pseudocode if the language doesn't support them.

---

## Task

Apply these conventions as the shared baseline whenever design or code comes up in conversation with the user. Draw from Resources as needed while discussing or designing.

When the discussion is substantial enough to warrant one, the deliverable is a design spec to share with the user for review.

---

## Resources

### API surface design

Functions, classes, and methods with type signatures without implementation body. Include throwables (i.e. `Errors`, `Exceptions`, `Panics`, ...) as part of the signature wherever the language supports them. 

### Data shape design

Types and interfaces the feature operates on.

### Behavior design

If needed, for api surfaces define a spec. That may cover various aspects: what it does, inputs, outputs, constraints, side effects, and error modes. 

Give the spec as pseudocode or prose, whichever communicates it better.

You may also pin the spec down with tests to help in implementing the spec. 
