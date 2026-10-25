# Reading patterns

How agents should read recurring patterns in a map built on the [spec sharing model](model-definitions-and-capabilities.md). Stub: points collected so far, to be developed.

## Relationships between components

Because of the tight coupling between parent and child there shouldn't be the need to draw **dependencies** between the two.

## Single and multiple parents

With single parents, if there's the need for multiple nodes to share the same child, that should be hoisted under their nearest common parent and linked at with dependency edges.

## Where specs move

Within a boundary, specs are shared. A component works within what its parents ask of it (refinement), and its parent counts the component's specs as its own (emergence).

Across a boundary, specs are exchanged as a contract. The consumer takes what it relies on from the provider (import), and states what it needs from the provider in return (expectation).

## Pass modes

- In an all-pass flow, an opted-out spec is a decision, not a gap to fix.
- In a some-pass flow, the non-chosen specs are not the target's concern, and not choosing a spec could be a gap.
- An all-pass flow across a dependency resembles containment. A consumer that sees everything of its provider behaves like the provider's child, and a provider that receives everything of a consumer behaves like the consumer's child. An all-pass import could suggest "conforms to" rather than "uses". See [Reading patterns in the graph](#reading-patterns-in-the-graph).

## Blocking specs

A spec missing from a component can be private, unpassed or a gap. A deactivated spec is never a gap: it is a known decision.

## Bottom-up: emergence

- An emerged offer is part of the parent's surface. Rely on it through the parent, without reaching for the child.

## Outside-in: import

- **Internal and external alike.** A library modelled inside the map and a third-party service are imported the same way. For an external one, its specs describe the surface it exposes.

## Shared types

- **Contract, not catch-all.** A component that holds types shared by peers is sound when it's named after what the types describe, like "Order events" or a wire format: it can change, break and be checked. A component named after the fact that it holds types, like a `types.ts`, is a drawer. Move each type to the component that owns the concept, or to the system's root if the whole system uses it.
- **Same type in two places.** When two components define the same type, look for a missing dependency between them, or a contract they both rely on. Two separate definitions are fine only when they're meant to diverge.

## Reading patterns in the graph

Some concepts are not relationships of their own, but readings of patterns made of the elements above.

- **Conformance.** A component that imports all of another's specs suggests it conforms to it, like a service following a regulation, a convention or a template. The general side is a standard, not something the component uses.
- **Substitution.** Several components that import all of the same component's specs suggest interchangeable implementations of a contract, like Stripe and PayPal gateways for a general payment gateway.

These are suggestions, not rules. Read them together with the rest of the map.
