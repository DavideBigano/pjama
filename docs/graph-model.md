# Pjama graph model

How specs are shared between components. The model maps the behaviours a user may need from the app when working with components and their specs. It is the starting point for deciding which functionalities to expose.

The model does not decide what is objectively correct about a system. A map holds a single view of the system, and how to structure its components is left to the judgement of the user or agent drawing it. The model says what those choices mean, and how agents should read them.

## Building blocks

- **Component**: a structural unit of the system, at any granularity. It holds specs.
- **Spec**: a single statement about a component, such as a requirement, use case or interface. All specs behave the same way, and their kind only adds meaning. A single spec belongs only to one component and can be "seen" by multiple. 
- **Containment**: a component sits inside the boundary of their parent/s. The edge points from child to parent.
- **Dependency**: a component (the consumer) uses another component (the provider), outside its boundary. The edge points from the consumer to the provider.

## How specs move

Specs can move through components in three ways:

| Type      | Edits       | Ownership                                   |
| --------- | ----------- | ------------------------------------------- |
| Reference | linked      | Source for the original                     |
| Copy      | independent | Source for the original, target for the new |
| Move      | n/a         | Target for the original                     |

- **References** show the same spec in both places and editing one edits the other.
- **Copies** create a new spec from the original and the two are separate. Editing one doesn't influence the other.
- **Moved** another component becomes the owner of the spec.

### Examples

- **Reference**: a system must comply with GDPR, and every service shows the requirement. When the legal team updates it on the system, every service sees the new version.
- **Copy**: a new payments service copies the order service's idempotency requirement as a starting point and adapts it. Later changes to the order service's version do not reach it.
- **Move**: a top level component requires a GPL licensing, so that gets promoted to the top level component of the app.

## Relationships between components

Components can relate to each other in three ways. Two are drawn as edges, and the third is implied by containment. Each relationship gives the meaning of the link, and the flows below describe how specs travel along it.

| Relationship     | Meaning                      | Edge                         |
| ---------------- | ---------------------------- | ---------------------------- |
| **Containment**  | is part of                   | child → parent               |
| **Dependency**   | uses                         | consumer → provider          |

- **Containment**: the child **is part of** the parent and they are one and the same.
- **Dependency**: the consumer **uses** the provider and the two remain two distinct components

### Examples

- A payments service **is part of** an e-commerce system.
- A checkout module **is part of** a shop and it's **used** by both the web and mobile storefronts of that shop.
- A settings screen **is part of** a mobile app.
- A shop **uses** Stripe to charge cards.
- A service **uses** Kubernetes to run clusters. The service imports the cluster's limits, and sets its own needs on the cluster as expectations.
- A frontend is built **using** a company design system.

## Single and multiple parents

Containment comes in two variants. Dependencies, however, would be constricted with one-to-one relationships so this distinction is not useful.

| Variant          | Parent count      | Boundaries  | Ancestors          |
| ---------------- | ----------------- | ----------- | ------------------ |
| Single parent    | none or one       | nested      | a single chain     |
| Multiple parents | none, one or more | can overlap | a graph, no cycles |

### Examples

- **Single parent**: a checkout module is part of a shop, and the web and mobile storefronts of that shop use it.
- **Multiple parents**: the same checkout module is part of both the web and the mobile storefront.

## Where specs move

Specs travel along both edge types, in both directions.

| Flow         | Name        | Edge                  | Specs travel        | Mechanics |
| ------------ | ----------- | --------------------- | ------------------- | --------- |
| Top-down     | refinement  | containment           | parent → child      | pull      |
| Bottom-up    | emergence   | containment           | child → parent      | push      |
| Outside-in   | import      | dependency            | provider → consumer | pull      |
| Inside-out   | expectation | dependency            | consumer → provider | push      |

- **Pull.** The source of the edge takes specs from its target.
- **Push.** The source of the edge gives specs to its target.

Top-down and outside-in have the same mechanics, and so do bottom-up and inside-out.

### Examples

- **Refinement**: a company adopts a security policy, so every team's service must follow it.
- **Emergence**: a service's API is defined in its authentication submodule, but it is the service's API and the interfaces the module defines are also the service's interfaces.
- **Import**: Stripe sets rate limits and error codes, and the shop charging cards through it plans around them.
- **Expectation**: a bank must keep customer data in the EU, so it needs a cloud provider that stores it there.

## Pass modes

Each flow can share specs in one of two modes, and both are available.

| Flow         | All pass, opt-out   | Some pass, opt-in     |
| ------------ | ------------------- | --------------------- |
| Top-down     | propagation         | allocation            |
| Bottom-up    | aggregation         | exposure              |
| Outside-in   | wildcard import     | selective import      |
| Inside-out   | blanket expectation | selective expectation |

- **All pass.** Every spec passes by default. Single specs can be opted out.
- **Some pass.** No spec passes by default. The specs that pass are chosen one by one (opt-in).

### Examples

- **Propagation**: a company security policy reaches every team's service.
- **Allocation**: a billing system must issue invoices as PDFs, and only its invoicing service takes that on.
- **Aggregation**: every spec of a mobile app's features counts as a spec of the app.
- **Exposure**: a subsystem surfaces only its public API, and keeps how it works internally to itself.
- **Wildcard import**: a service takes on everything a regulation component states.
- **Selective import**: a shop relies only on Stripe's card charging API and its rate limits.
- **Blanket expectation**: a web app relies on a backend built just for it, so every use case of the app is an expectation on that backend.
- **Selective expectation**: a mobile team asks the backend team only for an endpoint that answers within 200 ms.

## Forwarding

The following defines how far a spec keeps travelling once it has crossed an edge. A hop is one edge.

| Flow         | One hop          | N hops                         | Unbounded                 |
| ------------ | ---------------- | ------------------------------ | ------------------------- |
| Top-down     | children         | descendants down to N levels   | whole subtree             |
| Bottom-up    | parent           | ancestors up to N levels       | every ancestor, to a root |
| Outside-in   | direct consumers | consumers of consumers, N deep | whole consumer chain      |
| Inside-out   | direct providers | providers of providers, N deep | whole provider chain      |

Each cell lists the components a spec reaches from where it is defined.

Each flow is tied to it's own hop count.

Vertical flows naturally gravitate towards high-count-N-hops and unbounded, while horizontal ones towards one-hops.

Since the flow directions are one-way, specs never travel back to a component they already passed through. Spillover never returns a spec to the sibling it came from.

### Examples

- **Unbounded refinement**: a system must comply with GDPR, so a PDF service two levels down under Billing cannot write invoices to disk unencrypted.
- **One-hop refinement**: a platform requires each of its services to publish a health check endpoint. The modules inside each service don't need each other.
- **Unbounded emergence**: a login endpoint is defined in component two levels deeper than the service component which is what's exposing the interface.
- **One-hop emergence**: a dashboard widget shows a loading state while its data arrives. That is part of how the dashboard page behaves, but not something the whole web app states about itself.
- **Unbounded import**: a logging library links a GPL library, and an app uses the logging library. The GPL terms reach the app through the chain, even though the app never uses the GPL library directly.
- **Unbounded expectation**: a bank expects its data to stay in the EU. The requirement must hold for its cloud provider, the provider's storage vendor, and that vendor's backup service, the way GDPR binds every sub-processor down the chain.
- **One-hop import**: a shop plans around Stripe's rate limits, but not around the limits of the cloud Stripe runs on.
- **One-hop expectation**: a bank expects its cloud provider to keep data in the EU. The provider passes the requirement on to its storage vendor only by stating it as its own expectation, like a flow-down clause in a subcontract.
- **N hops**: a team guideline applies to the team's services, but not to the modules inside them.

## Blocking specs

A spec can be stopped at three points of its path, each with different blocks and dynamics.

| Stage     | Block mode     | Applies to     | Incoming edge   | Current node    | Outgoing edge |
| --------- | -------------- | -------------- | --------------- | --------------- | ------------- |
| Pre-node  | pass exception | incoming specs | shown, active   | not shown       | not shown     | 
| In-node   | deactivation   | in-node specs  | shown, inactive | shown, inactive | shown, active |
| In-node   | termination    | in-node specs  | shown, inactive | shown, inactive | not shown     |
| Post-node | encapsulation  | outgoing specs | n/a             | shown, active   | not shown     |

Each block mode may be applied to each edge independently from each other and to specs in an all-pass/some-pass mode.

**Pass exceptions** are expanded upon for each flow in [Pass modes](#pass-modes)

### Examples

- **Pass exception**: a shop imports Stripe's card charging API, but not its payouts API.
- **Deactivation**: a test harness inside an app receives the app's GPL licence, and deactivates it because the harness never ships.
- **Termination**: an open-source library vendored inside an app receives the app's coding conventions. Its code is third-party, so the conventions don't bind it, and they stop there instead of reaching the library's own modules.
- **Encapsulation**: a service's retry policy for its own database is private. It doesn't emerge into the platform, spill over to other services, or get imported by consumers.

## Changing flow

A spec that reaches a component through one flow may continue through another, for example refined into a child and then expected of the child's providers. The component where this happens is the pivot.

### Number of changes

| Variant   | Flows on a spec's path | Reach                                          |
| --------- | ---------------------- | ---------------------------------------------- |
| Never     | one                    | the flow's own forwarding                      |
| N times   | up to N + 1            | N pivots away from where the spec is defined   |
| Unbounded | any                    | any component connected by a chain of edges    |

### Hop count on change

| Variant  | Count after the pivot                 | Effect                                       |
| -------- | ------------------------------------- | -------------------------------------------- |
| Kept     | the remaining hops carry over         | the whole path shares one budget             |
| Reset    | the same count again, from zero       | every segment gets the same budget           |
| Switched | the new flow's own count              | each segment follows its flow's forwarding   |

### Opposite flows

| Flows                   | Independent              | Coupled                                                                      |
| ----------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| Top-down / bottom-up    | each counts its own hops | a hop down uses one top-down hop and adds one bottom-up hop                  |
| Outside-in / inside-out | each counts its own hops | a hop to a consumer uses one outside-in hop and adds one inside-out hop      |

TBD:
- coupled flows let a spec climb back up as far as it went down. With single parents, that returns it to components it already passed through, which [Forwarding](#forwarding) rules out.
