# Specification Hierarchy

## Status

Accepted

## Context

DP Explorer's original `ProblemSpec` was designed for functional dynamic
programming: a state is computed from dependency values. It cannot express the
required semantics of propagation problems, where processing a source state
emits contributions that are aggregated into successor states.

Version 2 has already accepted separate functional and propagation execution
models. The specification boundary must now express that distinction. A common
contract must retain genuinely shared information, while each model must expose
only the mathematical operations meaningful to its compatible runtime.

## Decision

DP Explorer will use a specification hierarchy with `CompiledSpecification` as
the common conceptual base and `FunctionalProblemSpec` and
`PropagationProblemSpec` as model-specific specializations.

The common base owns model-neutral identity, metadata, state-space description,
runtime-input requirements, common outcome context, and model-neutral
educational metadata. `FunctionalProblemSpec` owns dependency semantics,
recurrence evaluation, base cases, and functional ordering requirements.
`PropagationProblemSpec` owns transition emission, aggregation, initialization,
and propagation scheduling semantics.

The hierarchy defines responsibility and compatibility; it does not prescribe
concrete programming-language interfaces or runtime APIs.

## Alternatives Considered

### Single `ProblemSpec`

This was rejected because functional computation and propagation updates do not
share one meaningful operational contract. A single type would be overly broad,
with unrelated operations and ambiguous lifecycle rules, or too narrow to
express propagation faithfully.

### `executionModel` flags

This was rejected because a flag defers meaning to conditional interpretation.
It creates irrelevant fields, permits invalid combinations, and spreads model
branching through compiler, runtime, trace, and presentation consumers. The
specification category should make the model explicit.

### Composition instead of inheritance

This was rejected as the primary architectural model because composition alone
does not define which capabilities are required together or which runtime may
consume them. It risks rebuilding a loose collection of optional feature sets.
The accepted hierarchy first defines the conceptual contracts and their shared
base; implementation may choose appropriate composition internally only if it
preserves those explicit compatibility boundaries.

### Runtime-owned specifications

This was rejected because it would move problem mathematics into execution
mechanics. The compiler could no longer produce a stable, independently
validated specification, and runtimes would need to reconstruct authoring
intent. Specifications must remain a declarative boundary consumed by runtimes.

## Consequences

The compiler and Builder must ultimately select and validate the appropriate
specialization before execution. Runtimes consume only their compatible
specification category and remain free to implement model-specific mechanics
without interpreting unrelated semantics.

Execution traces, playback, and visualization remain downstream and
trace-driven. Their future contracts must recognize model-specific events, but
they must not recompute algorithms or alter specifications. Shared metadata and
state-space context remain consistently available across the pipeline.

The architecture introduces additional named concepts, but prevents optional
or flag-driven ambiguity and keeps contracts aligned with the mathematics being
taught.

## Future Implications

A new execution model should add a new specialization to the hierarchy, a
compatible runtime, and model-specific trace semantics. It inherits only facts
that are genuinely common from `CompiledSpecification`; its mathematical
operations, scheduling constraints, and answer relationship remain specific to
the new model.

Existing functional and propagation specifications and runtimes should not need
to change merely because another execution model is added. Any proposed new
base concept must first be shown to be required and identically interpreted by
all models.
