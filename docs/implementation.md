# pjama implementation of the model

Which parts of the [spec sharing model](model-definitions-and-capabilities.md) pjama implements, and how. Stub: points collected so far, to be developed.

## How specs move

TBD:
- whether a fork keeps a note of its origin, so readers can trace where it came from without the two being linked.

## Relationships between components

There is only one **dependency** type but that doesn't mean it cannot have tags that carry added meaning for the reader.

## Single and multiple parents

TBD:
- which variant pjama implements. Multiple parents could be convenient for users, at the cost of overlapping boundaries, conflicting inherited specs and harder forwarding.

## Pass modes

- Allocation may be desirable to implement as it segregates concern between the children as not every spec matters to every part.

## Forwarding

TBD:
- whether N hops should anchor to a named ancestor ("up to the service") instead of counting edges, so it survives restructuring.

## Blocking specs

TBD:
- whether deactivation always requires a reason.

## Outside-in: import

- **Surface.** What a consumer can import is the provider's surface. Specs of the provider's children (bottom-up) are part of it, so the consumer never needs to reach past the provider.
- **No forced interfaces.** Imports are not required to rely on an interface, and get no dedicated interface field. Keeping specs and imports uniform takes priority. The UI and agents may still nudge towards interfaces, for example by listing a component's interfaces first when picking specs.

## Inside-out: expectation

- **Expectations of a provider.** The consumer states what the provider must offer for the consumer to use it. For example, a consumer passes its inherited GDPR requirement to a library it uses as an expectation. A conflict then shows on the library, where it actually lives, instead of depending on the consumer happening to import the library's "logs in plain text" spec.
- When an expectation conflicts with the provider's own specs, the conflict is a signal about the dependency, not an error in either spec.
