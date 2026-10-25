# Enforcement model

On its own, a spec only states the desired result and says nothing about whether the actual result matches it. **Enforcement** closes that gap by associating each spec with the tests that check the actual result against the desired one.

**Verification** runs those tests. It either confirms that the spec holds or exposes a gap between the spec and reality.

## Link types

| Link         | Name       | Points to   | Purpose                                                         |
| ------------ | ---------- | ----------- | --------------------------------------------------------------- |
| Spec-to-spec | derivation | other specs | breaks a spec down into more granular ones                      |
| Spec-to-test | validation | tests       | forward traceability: ensures every requirement has its tests   |

## Spec-to-spec link meaning

| Meaning    | The spec                                  | The underlying specs           |
| ---------- | ----------------------------------------- | ------------------------------ |
| Derivation | is broken down into more granular specs   | refine it                      |
| Deferral   | defers its own validation                 | are validated on its behalf    |

TBD:
- whether the link carries only one of the two meanings or both.

## Link reach

A spec can be linked to underlying specs within one of these scopes.

| Scope     | Underlying specs                     | Crosses component boundaries |
| --------- | ------------------------------------ | ---------------------------- |
| Graph     | live anywhere in the graph           | freely                       |
| Component | live in the same component           | no                           |
| Flow      | flow into the same component         | only along flows             |

## Failure travel modes

A failure starts at a test and can travel through specs and components.

| Level      | Failure in                      | Affects                                   | Direction  |
| ---------- | ------------------------------- | ----------------------------------------- | ---------- |
| Test       | failing test                    | its host spec                             | n/a        |
| Spec       | affected spec                   | its host component                        | n/a        |
| Component  | affected component              | its parent                                | bottom-up  |
| Component  | affected component              | its descendants                           | top-down   |
| Component  | affected component              | its consumers                             | outside-in |
| Component  | affected component              | its providers                             | inside-out |
| Spec       | affected spec                   | the specs it is derived from              | upward     |
| Spec       | affected spec                   | the specs derived from it                 | downward   |
| Dependency | imported spec in the consumer   | its original in the provider              | inside-out |
| Dependency | expected spec in the provider   | its original in the consumer              | outside-in |

## Guarantee of validation

| Variant               | Refined specs          | Unrefined specs        |
| --------------------- | ---------------------- | ---------------------- |
| All, required         | must be test-validated | must be test-validated |
| All, optional         | can be test-validated  | can be test-validated  |
| Leaves only, required | not test-validated     | must be test-validated |
| Leaves only, optional | not test-validated     | can be test-validated  |

In every variant, any spec can be refined.

<!-- impl doc -->
**Observation**: a spec that is refined by others usally cannot rely only on validation of it's individual children but it also needs validation for their integration. Said validation can only live at the level of said spec. Then this becomes more a matter of choosing how strictly to enforce this in implementation.

## Prior art

- **Requirements traceability** (DO-178C, ISO 26262, IEC 62304):
  - Every test traces up to a/the requirement that it came from (*Backward traceability*).
  - *Backward traceability* ensures that no extra code exists.
  - *Backward traceability* helps on Change Impact Analysis.
  - DO-178C's **derived requirements**: lower-level requirements that don't trace to a higher one must be justified explicitly.
  - Requirements are associated to "strictness levels" for verification.

- **Verification methods** (systems engineering, e.g. NASA): 
  - Test: checks run under controlled conditions. Quantitative and repeatable.
  - Analysis: reasoning about the result through models, claculations, simulations and formal proofs when testing is not feasable.
  - Demonstration: using the product. Pass/fail outcome. Not repeatable nor quantitative.
  - Inspection: examining the product to check for properties without using it.
  - Test and analysis can be automated.
  - Demonstration and inspection usually need a person, and produce a dated record tied to the current state of the code.
  - Many specs can't be checked by an automated test (e.g. "licensed under MIT", "GDPR compliant", "follows the naming convention").
  - Inspection (review) and analysis (linters, static checks) are legitimate ways to enforce them. 
  - Ties to the conventions item in [todo.md](../todo.md), where a linter config enforces a convention.

- **Design by Contract** (Meyer). 
  - Preconditions: what the caller must satisfy/ensure before making a call. Violation implies that the call doesn't guarantee a safe output.
  - Postconditions: what the supplier must ensure the call does. Requires that the preconditions are met. 
  - Invariants: properties that must be ensured by every call. Requires that both pre and postconditions are met.
  - A failed precondition is the caller's fault
  - A failed postcondition the supplier's fault. 
  - Invariants are all of the supplier's specs. 

<!-- new todo -->
- **Compliance frameworks** 
  - This system could be used for compliance standards and frameworks. 
  - Possible candidates:
    - DO-178C
    - ISO 26262
    - IEC 62304
    - SOC 2
    - ISO 27001
  - Additional features or dedicated specs may be required. 
  - Points to develop:
    - Control vs evidence for control.
    - Requirement-to-requirement traceability (control).
    - Requirement-to-test traceability (control).
    - Risk acceptance through exceptions with reasons.
    - Point-in-time evidence vs continuous monitoring, for keeping spec fulfillment status fresh (evidence for control).

## For other docs

<!-- patterns doc -->
A spec with no associated test is a stated intent. The map cannot tell whether the system meets it.

<!-- patterns doc -->
## Bottom-up: emergence
To change an emerged spec, change the part it comes from.

<!-- patterns doc -->
## Outside-in: import
If the consumer needs something the provider does not offer, record it as an expectation on the provider, not as a change to the provider's specs.

<!-- patterns doc -->
## Inside-out: expectation
An expectation shown on a provider belongs to the consumer. It is a condition for the consumer's use of the provider, not one of the provider's own specs.

TBD:
- what the provider is expected to do with the expectations it receives. This depends on the enforcement model.
- For architectural design frameworks usually requirements map to code that is mapped to test that are also mapped to requirements. For the graph as specs maps to components and specs maps to tests that map to code. To make the circle complete it's worth investigating into mapping components to code (it's already like that to some extent as components have source code location). 

<!-- patterns doc -->
**Conflict resolution.** A conflict such as an inherited GDPR requirement against a library that logs in plain text is resolved one of two ways:
  - change the provider, for example by wrapping it;
  - record an exemption with a reason.

<!-- patterns doc -->
A spec is enforced by tests appropriate for the spec's depth in the graph. A very refined spec that lives in a low level component will generally gravitate towards unit tests an a less refined one towards e2e/acceptance tests or even to reviews.

<!-- generally important to keep in mind -->
Passing tests show the system matches the spec, not that the spec is correct.

<!-- impl doc -->
**Ideas**
  - Implementation: Containment relationship with only a top-down flow.
  - Conformance: Dependency relationship with only an outside-in flow (all pass).

<!-- outside scope fror the project, still interesting for the patterns doc -->
**Test oracle problem** (and Goodhart's law)
  - Who controls the controllers? / How do we know the controllers are controlling properly?
  - A test is another claim, not ground truth.
  - Mutation testing exists to check whether tests actually catch failures.
  - Specs linked to weak tests look fulfilled => the mechanism is fragile.