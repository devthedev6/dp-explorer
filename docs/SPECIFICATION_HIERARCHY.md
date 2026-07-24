# Specification Hierarchy

## Motivation

The original `ProblemSpec` assumed every dynamic program computes a state from
dependency values. That is a good functional-DP contract, but Version 2 also
supports propagation: processing a state emits updates that are aggregated into
successors. These are different mathematical actions, not merely different
traversals of one contract.

One generic specification would either carry concepts that have no meaning for
one model or hide required behavior behind flags and optional members.
Execution-model-specific specifications provide stronger contracts: each states
the mathematics a compatible runtime may interpret, while a common base retains
only concepts whose meaning is stable across all execution models.

## Design Goals

- **Explicit semantics:** a specification category reveals its execution model.
- **Separation of concerns:** specifications describe problems; runtimes
  execute them; traces record them; playback and visualization explain them.
- **Model-specific contracts:** each model declares only meaningful concepts.
- **Future extensibility:** new models can be added without changing existing
  model contracts or runtimes.
- **Minimal duplication:** genuinely common concepts are declared once.
- **Educational fidelity:** declarative explanatory context travels with a
  problem without leaking presentation or execution mechanics into it.
- **Stable compilation boundary:** compilation produces complete,
  runtime-consumable descriptions rather than runtime-owned authoring state.

## Hierarchy Overview

```text
CompiledSpecification
        |
        +-- FunctionalProblemSpec
        |
        `-- PropagationProblemSpec
```

`CompiledSpecification` is the model-neutral boundary for a problem after
compilation. It establishes shared identity, inputs, and state-space facts.

`FunctionalProblemSpec` refines that boundary for dependency-based state
computation. It declares recurrence-oriented mathematics for a functional
runtime.

`PropagationProblemSpec` refines it for state-to-successor updates. It declares
transition and aggregation mathematics for a propagation runtime.

The hierarchy is conceptual rather than a prescription for a language feature.
It establishes compatibility and ownership: a model-specific runtime consumes
its corresponding specialization and does not interpret another model's
semantics.

## CompiledSpecification

The common base contains only information needed by every execution model and
interpreted identically by all of them.

### Identity and stable metadata

A stable identity and human-readable metadata—name, description, source, and
educational context—identify a problem for authors, tools, saved sessions, and
learners. They belong in the base because execution model does not change a
problem's identity or explanatory framing.

### State-space description

Every model operates over addressable DP states. State variables, shape,
bounds, and dimensions describe where values can exist, not how values are
produced. Functional runtimes resolve dependencies within this space;
propagation runtimes validate sources and successors within it. The shared fact
is the state space itself.

### Runtime inputs

Input requirements and their meaning belong in the base. Inputs instantiate a
problem's state space and constrain execution, but they are not an execution
strategy. All models need validated runtime data before model-specific work.

### Problem-level outcome context

Every problem has an answer-oriented outcome, even when its route differs. The
base may carry common declarative context identifying what a completed execution
represents. It must not encode functional reads or propagation updates as the
means of obtaining the outcome.

### Educational metadata

Model-neutral annotations about a problem's domain, notation, constraints, or
learning context may belong in the base because they travel through compilation,
execution, playback, and visualization. UI layout and rendering decisions do
not belong there; they remain visualization responsibilities.

The base must not be a convenience container. A concept belongs there only when
all execution models require it and interpret it identically. Evaluation,
mutation, ordering, and aggregation operations are not common merely because
every model eventually executes.

## FunctionalProblemSpec

`FunctionalProblemSpec` owns dependency-based state-computation concepts.

### Dependency semantics

Functional DP expresses a state's value in terms of other state values. The
specification therefore describes valid dependency reads and how they compute
the current state. This does not belong in the base: propagation does not
compute a source state by resolving its dependencies.

### Recurrence evaluation and base cases

Functional semantics distinguish base states from states evaluated through a
recurrence. These determine the mathematics consumed by a functional runtime.
They are not general contract requirements: propagation initializes and updates
states rather than classifying every state as a recurrence or base case.

### Dependency ordering

Functional bottom-up evaluation needs dependencies before consumers; top-down
evaluation needs safe dependency resolution. This is a functional requirement,
not a universal execution order. Propagation scheduling instead concerns source
processing and repeated successor updates.

### Functional answer relationship

Where an outcome is described in terms of completed functional state values,
that relationship belongs to this specialization. The common base can identify
the outcome but must not assume it is reached through recurrence completion.

These concepts remain outside the base because not every model has dependency
evaluation, base cases, or dependency-safe completion.

## PropagationProblemSpec

`PropagationProblemSpec` owns state-to-successor propagation concepts.

### Transition emission

Propagation specifies valid successors for a processed source state and the
contribution carried by each transition. This is an outgoing effect, not a
functional dependency needed to compute the current state.

### Aggregation semantics

A propagation target may receive multiple contributions. The specification must
define how they combine with its current value, such as addition for counting
or an extremum for optimization. Functional recurrence arithmetic does not
define an update rule for repeated writes to a successor.

### Initialization semantics

Propagation needs a mathematical account of values present before states emit
transitions, including seeds and neutral values where relevant. Functional base
cases are not a substitute: initialization starts a flow of updates, whereas a
base case resolves the value of one state.

### Propagation scheduling semantics

The model describes constraints under which source states are processed and
updates become observable. This differs from dependency ordering: it concerns
the correctness of repeated successor updates and information flow.

### Propagation answer relationship

Where an outcome is selected from accumulated state after propagation, that
selection belongs to this specialization. The base must not assume the
functional notion of an answer derived from recurrence completion.

These concepts do not meaningfully constrain functional execution. Putting them
in the base would incorrectly require functional problems to provide successors,
aggregation, initialization, and propagation scheduling.

## Separation of Responsibilities

| Layer                  | Owns                                                                                                     | Does not own                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Builder                | Declarative authoring state and user-facing problem construction.                                        | Compilation, execution, trace generation, or rendering.                  |
| Compiler               | Parsing, validation, model selection, and transformation into complete compiled specifications.          | Runtime scheduling, storage, playback, or UI behavior.                   |
| CompiledSpecification  | Shared identity, state space, inputs, outcome context, and model-neutral educational metadata.           | Model-specific evaluation or update semantics.                           |
| FunctionalProblemSpec  | Dependencies, recurrence and base-case semantics, and functional ordering requirements.                  | Propagation transitions, aggregation, or propagation scheduling.         |
| PropagationProblemSpec | Successor transitions, contributions, aggregation, initialization, and propagation scheduling semantics. | Functional dependency resolution, recurrence evaluation, or memoization. |
| Runtime                | Compatible-specification execution, storage, runtime mechanics, and trace production.                    | Specification mutation or rendering.                                     |
| Execution Trace        | Immutable record of observable execution events and state changes.                                       | Algorithm selection or recomputation.                                    |
| Playback               | Deterministic conversion of trace history into inspectable moments.                                      | DP evaluation and rendering policy.                                      |
| Visualization          | Human-facing presentation and interaction over playback state.                                           | Algorithm execution, trace invention, or specification mutation.         |

Each concept has one primary owner. A later layer may consume an earlier layer's
information but must not silently take over that responsibility.

## Design Invariants

- Runtimes consume compatible compiled specifications but never modify them.
- Specifications describe mathematics and declarative constraints, not loops,
  storage, memoization machinery, UI behavior, or playback control.
- The common base contains only concepts required by every model with the same
  meaning.
- Model-specific semantics appear only in their corresponding specialization.
- Functional runtimes never interpret propagation transitions or aggregation.
- Propagation runtimes never interpret functional dependency evaluation as their
  own execution contract.
- Compilation completes validation before producing a runtime-consumable
  specification; runtimes do not reconstruct authoring intent.
- Execution traces are immutable runtime records and the source of truth for
  playback and visualization.
- Playback and visualization do not recompute DP semantics from specifications.
- Adding a model must not force existing models to accept unrelated behavior.

## Extensibility

A future model adds a new specialization of the common compiled boundary and a
runtime dedicated to it. The specialization inherits only fixed common
responsibilities: identity, model-neutral metadata, state-space description,
runtime inputs, and any concept proven universal.

It then declares its own mathematical operations, correctness constraints, and
answer relationship. Its runtime owns the mechanics and its trace records the
events required to explain them. Existing functional and propagation contracts
remain unchanged.

Before promoting a concept to `CompiledSpecification`, future design must show
that every existing and proposed model both needs it and gives it the same
meaning. Otherwise, it belongs in a specialization or another layer.

## Open Questions

The following are intentionally deferred to future design sessions:

- Concrete runtime APIs and model-specific specification representations.
- Precise validation rules for model-specific operations.
- Functional and propagation scheduling mechanisms.
- Execution-trace schemas and event granularity.
- Playback contracts for model-specific trace events.
- Visualization capabilities, controls, and views for each model.
- Builder flows for model selection and model-specific authoring.
- Representation of the hierarchy in templates, import/export, and persistence.
