# Execution Models

## Motivation

Dynamic programming has two important execution families. The first computes a
state from values already held by its dependencies:

```text
DP(state) = F(DP(dep1), DP(dep2), ..., DP(depN))
```

Fibonacci, LCS, edit distance, knapsack, matrix-chain multiplication, digit
DP, and interval DP fit this family. Each state is the unit of computation: the
runtime reads dependencies and writes one computed value for the state.

The second processes a state and distributes its value to successor states:

```text
DP(next) = aggregate(DP(next), contribution(DP(current)))
```

Coin Change (Number of Ways), grid-path counting, SOS DP, and many
combinatorial propagation DPs fit this family. A successor can receive multiple
contributions over time. The transition and its update, rather than a single
state computation, are the unit of execution.

These semantics are not interchangeable. One model would either misrepresent a
family or carry abstractions that do not belong to it. DP Explorer therefore
treats functional and propagation execution as first-class execution models.

## What is an Execution Model?

An execution model defines how a compiled DP specification becomes an
execution: which operations are meaningful, how values are produced or updated,
and which events must be recorded to explain the process. It is the contract
between a model-specific specification and its runtime.

```text
Builder -> Compiler -> Compiled Specification -> Model-specific Runtime
       -> Execution Trace -> Playback -> Visualization
```

| Layer           | Responsibility                                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder         | Captures a declarative problem description. It does not execute DP.                                                                          |
| Compiler        | Parses, validates, and transforms the description into a model-specific compiled specification. It does not evaluate a problem.              |
| Specification   | Describes the mathematics and permitted operations of one model. It does not own storage, scheduling mechanics, playback, or rendering.      |
| Runtime         | Executes a compatible specification, manages DP storage and evaluation or propagation, and emits an immutable trace. It has no UI knowledge. |
| Execution Trace | Records the authoritative history of observable runtime events. It does not re-execute the algorithm.                                        |
| Playback        | Converts a trace into deterministic moments for inspection. It does not infer or recompute DP logic.                                         |
| Visualization   | Renders playback state for people. It does not mutate the DP table or implement algorithmic behavior.                                        |

An execution model owns its evaluation semantics, model-specific scheduling and
update rules, and model-specific trace meaning. It does not own authoring UX,
compiler parsing mechanics, generic playback controls, or visual presentation.

## Functional Execution Model

The functional model expresses a recurrence as a function of dependency values:

```text
value(s) = F(value(d1), value(d2), ..., value(dn))
```

For a non-base state `s`, the specification identifies dependencies `d1 ... dn`
and a computation `F`. The runtime resolves those dependencies, then writes the
result for `s`. A base case supplies a value without dependency evaluation.

```text
read dependency values
        |
        v
DP(d1), DP(d2), ... -> F -> write DP(s)
```

In top-down execution, a dependency read may trigger recursive evaluation. The
runtime visits required states, memoizes each completed value, and reuses a
stored value when it is requested again.

```text
evaluate(s)
  -> evaluate(d1) -> memoize DP(d1)
  -> evaluate(d2) -> memoize DP(d2)
  -> compute F(DP(d1), DP(d2))
  -> memoize DP(s)
```

In bottom-up execution, the specification supplies an order in which every
dependency is available before its consumer. The runtime visits each state in
that dependency-safe order, applies base-case semantics or the transition, and
writes the state once.

The defining property is state computation. Recursion and memoization are
top-down scheduling mechanisms; bottom-up evaluation schedules the same
functional semantics differently.

## Propagation Execution Model

The propagation model expresses a state as a source of successor updates:

```text
for each transition s -> t:
  contribution = G(s, t, DP(s))
  DP(t) = aggregate(DP(t), contribution)
```

The aggregation operation defines how a successor receives a contribution:
addition for counting, or maximum or minimum for optimization, for example.
Initialization establishes the values from which propagation begins.

```text
process DP(s)
   |
   +--> contribution(s, t1) -> aggregate into DP(t1)
   +--> contribution(s, t2) -> aggregate into DP(t2)
   `--> contribution(s, t3) -> aggregate into DP(t3)
```

Coin Change (Number of Ways) can add the current count for an amount to the
amount reached by a coin. Grid-path counting sends a cell's count to reachable
neighbors. A target state may therefore change repeatedly as predecessors are
processed.

```text
initialize state space
  -> select a state to process
  -> emit valid successor transitions
  -> aggregate every contribution
  -> continue according to the propagation schedule
```

The defining property is transition-driven update: processing a state changes
other states. A propagation runtime must preserve this temporal history because
intermediate values are meaningful both semantically and educationally.

## Comparison

| Topic            | Functional Execution Model                             | Propagation Execution Model                                            |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| State semantics  | A state is computed from dependency values.            | A state accumulates contributions from processed predecessors.         |
| Transitions      | Reads needed to compute the current state.             | Updates emitted from the current state to successors.                  |
| Dependencies     | Incoming and evaluated before state completion.        | Outgoing effects; a state can receive repeated updates.                |
| Writes           | Normally one completed write per state.                | Potentially many aggregate updates per state.                          |
| Recursion        | Natural for top-down dependency resolution.            | Not defining; processing follows a propagation schedule.               |
| Aggregation      | Internal to a recurrence result.                       | An explicit combination of successive contributions.                   |
| Execution traces | Evaluation, dependency reads, memoization, completion. | Processing, emitted transitions, contributions, prior values, updates. |
| Visualization    | Dependencies, recursion, completed values.             | Flow, successor updates, accumulation, changing values.                |
| Examples         | Fibonacci, LCS, edit distance, knapsack, interval DP.  | Coin Change ways, grid paths, SOS DP, combinatorial propagation.       |

## Architectural Evolution

The earlier conceptual boundary was:

```text
ProblemSpec
    |
    v
Runtime
```

Version 2 evolves it into a common compiled family with explicit branches:

```text
CompiledSpecification
        |
        +-- FunctionalProblemSpec
        |         |
        |         v
        |   Functional Runtime
        |
        `-- PropagationProblemSpec
                  |
                  v
           Propagation Runtime
```

The common compiled boundary holds genuinely shared information, while each
model-specific specification states only operations meaningful to its runtime.
Functional recurrence semantics remain separate from transition emission and
aggregation semantics.

A single specification with an `executionModel` flag would imply a shared
operational contract. Functional specifications need dependency evaluation;
propagation specifications need successor transitions and aggregation. A flag
would create irrelevant fields and invalid combinations, and force tooling to
branch where the specification type should communicate meaning. Separate types
make the distinction explicit and keep each runtime coherent.

## Shared Concepts

These concepts remain common to all execution models:

- **State space:** the addressable collection of DP states and its dimensions.
- **Runtime inputs:** validated values supplied at execution time.
- **Metadata:** identity, names, descriptions, and educational context.
- **Answer-oriented outcome:** each execution provides a result for its problem.
- **Trace-first playback:** runtimes emit immutable traces and playback derives
  deterministic inspection states from them.
- **Visualization philosophy:** the UI explains recorded execution rather than
  recalculating DP logic.

Execution-specific concepts differ:

| Functional                                                                                                   | Propagation                                                                                            |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Base-case computation, dependency reads, recurrence evaluation, memoization, and dependency-safe completion. | Initialization, processed-state selection, successor emission, contributions, and aggregation updates. |

Common concepts should be shared because their meaning is common, not used to
erase the distinct semantics that govern execution.

## Extensibility

A future execution model can be added by defining a compiled specification
type, a runtime that consumes only that type, and trace vocabulary for its
observable execution. Existing functional and propagation runtimes do not need
to change because neither must interpret the new model's operations.

This grows the architecture by addition. A new model can share state-space,
input, metadata, playback, and visualization principles while defining its own
execution contract.

## Design Philosophy

DP Explorer models DP semantics honestly: distinct ways of executing dynamic
programs deserve distinct execution models. Specifications describe mathematics
declaratively; runtimes own mechanics; traces are the source of truth for
playback and visualization; and the UI never recreates algorithmic behavior.

Future models should be additive, explicit, and independently evolvable. Share
concepts where their meaning is genuinely common, and use model-specific
contracts where semantics differ. This preserves clarity for authors,
maintainers, and learners while allowing DP Explorer to grow beyond one family
of recurrences.
