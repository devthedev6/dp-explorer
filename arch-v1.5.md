# ARCHITECTURE v1.5

## Motivation

DP Explorer v1 successfully established a generic execution architecture capable of visualizing a broad class of dynamic programming algorithms using declarative `ProblemSpec`s.

However, while implementing additional templates, an important architectural limitation became apparent.

The framework currently assumes that the final answer of every dynamic programming problem corresponds to a single DP state.

Examples include:

- Fibonacci → `dp[n]`
- LCS → `dp[n][m]`
- Edit Distance → `dp[n][m]`
- 0/1 Knapsack → `dp[n][capacity]`
- Minimum Path Sum → `dp[lastRow][lastColumn]`

Many valid dynamic programming problems do not satisfy this assumption.

For example:

- Longest Increasing Subsequence
- Largest Square
- Maximum Rectangle
- Longest Bitonic Subsequence
- Maximum Sum Increasing Subsequence

These problems require post-processing over multiple DP states after execution has completed.

This document proposes an architectural evolution that separates **DP execution** from **answer extraction** while preserving the existing execution engine.

---

# Design Principles

The following principles guide the redesign.

## 1. Execution remains unchanged

The execution engine is responsible only for computing DP states.

Its responsibilities remain:

- dependency evaluation
- memoization
- iteration validation
- trace generation
- playback information

It should **not** perform answer aggregation.

---

## 2. DP becomes immutable after execution

Once execution completes, the computed DP table becomes frozen.

No further writes are permitted.

The frozen table becomes the canonical representation of the solved problem.

This guarantees:

- deterministic playback
- deterministic answer extraction
- immutable execution artifacts

---

## 3. Answer extraction is post-processing

Answer extraction is no longer considered part of DP execution.

Instead, it is a deterministic read-only computation performed on the frozen DP table.

Typical examples include:

- return final state
- maximum over all states
- minimum over final row
- sum over boundary states

The execution engine is unaware of how the final answer is obtained.

---

# New Execution Pipeline

The execution lifecycle becomes:

User selects template

↓

User edits input

↓

Input Model

↓

Validation

↓

ProblemSpec

↓

Execution queued

↓

Execution Engine

↓

ExecutionTrace

↓

Frozen DP Table

↓

Extraction Context

↓

Answer Extraction

↓

Execution Result

↓

Playback Controller

↓

UI

---

# Manual Override

User interaction always has priority over execution.

Any of the following actions immediately invalidate the current execution:

- switching templates
- changing any input field
- changing DP dimensions
- modifying grid values
- editing coordinate lists

When this occurs:

Current Session

↓

Discard Execution Trace

↓

Discard Frozen DP Table

↓

Discard Extracted Answer

↓

Return to Input State

↓

Queue New Execution

This guarantees that playback and visualization always correspond to the latest user input.

The UI must never display stale execution results.

---

# Extraction Context

Answer extraction operates on a read-only interface.

Unlike execution-time state access, extraction never performs recursion or state evaluation.

It only observes the completed DP.

Conceptually the interface exposes:

- read(state)
- states()
- dimensions
- input

No mutation operations are available.

---

# Execution Context vs Extraction Context

Execution Context

Responsible for:

- recursive reads
- memoization
- dependency validation
- trace emission

Extraction Context

Responsible for:

- immutable reads
- iteration over completed states
- aggregate computations
- final answer generation

Although both expose a `read()` operation, their semantics are fundamentally different.

Execution-time reads create values.

Extraction-time reads observe values.

---

# Execution Result

Instead of returning only an execution trace, the engine now produces an immutable execution artifact.

Conceptually this contains:

- ExecutionTrace
- Frozen DP Table
- Final Answer

Playback consumes only the trace.

The UI consumes:

- trace
- DP table
- answer

No component mutates the execution result.

---

# Future Compatibility

This architecture enables future versions of DP Explorer to support:

- aggregate answer extraction
- visual answer extraction
- user-authored ProblemSpecs
- DSL-generated extraction rules
- LLM-generated ProblemSpecs

without modifying the execution engine itself.

The execution engine remains responsible only for constructing the DP.

Everything after execution becomes deterministic post-processing over immutable state.

# Architectural Invariant

At every moment, the displayed execution must correspond exactly to the current (ProblemSpec, Input) pair.

Any modification to the template or input invalidates all derived artifacts, including:

Execution Trace
Frozen DP Table
Extracted Answer
Playback Controller

A new execution must be created before visualization resumes.

Under no circumstance should stale execution artifacts remain visible after a manual override.

---

# ProblemSpec as the Engine Intermediate Representation (IR)

One of the primary design goals of DP Explorer is to keep the execution engine completely independent of how a problem is authored.

The execution engine should understand exactly one language:

**ProblemSpec**

Regardless of how a problem is created, it must eventually compile into a valid `ProblemSpec` before execution begins.

The engine never consumes:

- user input
- DSL code
- natural language
- visual builder state
- JSON configuration

Instead, all authoring methods are considered front-ends that target the same intermediate representation.

Conceptually:

```
          TypeScript Template
                   │
                   │
                   ▼
             ProblemSpec (IR)
                   ▲
                   │
        ProblemSpec Compiler
                   ▲
                   │
      ┌────────────┼────────────┐
      │            │            │
      │            │            │
Visual Builder   JSON IR     Future DSL
      │            │            │
      └────────────┼────────────┘
                   ▲
                   │
          Natural Language
             (Future LLM)
```

This architecture deliberately separates **problem authoring** from **problem execution**.

Every future interface ultimately produces the same IR.

The execution engine therefore never requires modification when a new authoring interface is introduced.

---

# Evolution Roadmap

The evolution of DP Explorer is divided into three architectural milestones.

## Milestone A — Execution Architecture

Objective:

Separate DP execution from answer extraction.

Deliverables:

- Frozen DP table
- ExtractionContext
- Immutable Execution Result
- Aggregate answer extraction

This milestone does not introduce any new user-facing functionality.

It strengthens the execution architecture while preserving all existing templates.

---

## Milestone B — ProblemSpec Compiler

Objective:

Treat `ProblemSpec` as a true engine IR instead of a manually authored TypeScript object.

A compiler layer is introduced between external representations and the runtime engine.

Conceptually:

```
External Representation

↓

ProblemSpec Compiler

↓

Runtime ProblemSpec

↓

Execution Engine
```

Initially, the only external representation may simply be JSON.

The execution engine remains unchanged.

---

## Milestone C — Problem Authoring

Once the compiler exists, new authoring interfaces become possible.

Examples include:

- visual state builder
- graphical transition editor
- JSON editor
- textual DSL
- LLM-generated specifications

Each authoring method targets the same compiler.

No execution logic is duplicated.

The execution engine remains completely unaware of how the `ProblemSpec` was originally created.

---

# Architectural Invariant

The execution engine owns exactly one responsibility:

**Execute a valid ProblemSpec.**

It should never contain logic for:

- parsing
- DSL interpretation
- UI interaction
- visual editing
- natural language understanding

Similarly, authoring interfaces should never contain execution logic.

They are responsible only for producing a valid `ProblemSpec`.

This separation ensures that new interfaces can be added without modifying the execution engine.
