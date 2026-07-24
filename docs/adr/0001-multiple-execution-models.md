# Multiple Execution Models

## Status

Accepted

## Context

DP Explorer's original architecture centered on a functional `ProblemSpec` and
a runtime that computes every DP state from previously available dependency
states. This fits Fibonacci, LCS, edit distance, knapsack, digit DP, and
interval DP. Top-down recursion with memoization and dependency-safe bottom-up
evaluation are natural execution strategies for this family.

The architecture became limiting when the platform needed propagation-style
dynamic programs. In Coin Change (Number of Ways), grid-path counting, SOS DP,
and related problems, processing one state emits updates to successor states. A
successor can receive several contributions and aggregate them over time. These
semantics are not merely a different traversal of a functional recurrence: they
require explicit transition emission, aggregation, and a trace that preserves
intermediate updates.

Treating propagation as an edge case of the functional runtime would make the
core abstraction misrepresent the problems it is intended to teach.

## Decision

DP Explorer will support separate execution models. A common
`CompiledSpecification` concept will branch into `FunctionalProblemSpec` and
`PropagationProblemSpec`, each consumed by its own dedicated runtime.

The functional model represents dependency-based state computation. The
propagation model represents processing a state, emitting successor transitions,
and aggregating contributions into successor states.

Both models retain common platform concepts: state space, runtime inputs,
metadata, immutable execution traces, playback, and visualization principles.
Their operational contracts and trace semantics remain model-specific.

## Alternatives Considered

### Extending the existing runtime

This was rejected because the functional runtime resolves dependencies and
completes the current state. Propagation processes a source state and mutates
successor states through explicit aggregation. Combining the mechanisms would
make one runtime responsible for different invariants and obscure operation
meaning.

### Adding `executionModel` flags

This was rejected because a flag on a shared specification suggests one
contract is valid for both models. It would produce fields irrelevant to one
model, encourage invalid combinations, and spread branching throughout
compilation, execution, tracing, and presentation. The specification type,
rather than conditional interpretation, should express the execution model.

### Optional methods

This was rejected because optional dependency-evaluation, transition-emission,
or aggregation methods turn required semantics into nullable behavior. Every
consumer would need to discover which methods exist before determining what the
specification means. Focused model-specific contracts are clearer and safer.

### A single `ProblemSpec`

This was rejected because functional and propagation DP do not share one
meaningful operational abstraction. A single specification would be overly
broad, with unrelated methods and ambiguous lifecycle rules, or too narrow to
express propagation faithfully. Separate types retain common concepts without
conflating execution semantics.

## Consequences

The compiler and Builder will ultimately produce and validate model-appropriate
compiled specifications. The runtime layer will contain separate functional and
propagation runtimes rather than one conditional engine. Each runtime can
maintain its own scheduling rules, state-update invariants, and trace
vocabulary.

Playback and visualization remain trace-driven, but must present each model's
observable events appropriately. Functional views can emphasize dependency
evaluation and recursion; propagation views can emphasize transitions,
contributions, and accumulation. No UI layer should recompute algorithmic
behavior.

This decision increases the number of explicit architectural concepts, but
reduces accidental complexity by aligning types and runtimes with the
mathematics of the problems they serve.

## Future Implications

Future execution models can be added through addition: define a compiled
specification type, provide a dedicated runtime, and record the trace semantics
needed for playback and visualization. Existing runtimes do not need
modification to understand behavior outside their model.

This gives DP Explorer a scalable path to support more families of dynamic
programs while preserving clear contracts, isolated evolution, and a consistent
educational experience.
