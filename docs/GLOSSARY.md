# GLOSSARY

This document defines the canonical vocabulary used throughout DP Explorer.
Every architecture document, implementation, and future AI assistant should use
these definitions consistently.

---

## Algorithm

A procedure that solves a problem. DP Explorer supports algorithms that can be
expressed as state-space exploration.

---

## Problem Specification (ProblemSpec)

A declarative description of a problem.

A ProblemSpec describes _what_ the algorithm is mathematically, not _how_ it is
executed.

It defines:

- State variables
- Base cases
- Transition function
- Iteration order (if applicable)
- Answer extraction

Template authors write only the ProblemSpec.

---

## State

A single subproblem.

Examples:

- dp[i]
- dp[i][j]
- dp[node][mask]

Every state has a unique StateKey.

---

## StateKey

The canonical identifier for a state.

Examples:

- "5"
- "3,7"
- "4,12,9"

The engine internally refers to states using StateKeys.

---

## Transition

A rule describing how one state depends on other states.

Example:

dp[i][j] depends on

- dp[i-1][j]
- dp[i-1][j-weight]

Transitions define the dependency graph.

---

## Base Case

A state whose value is known without evaluating transitions.

Examples:

- i == 0
- j == 0
- index == n

---

## Execution Engine

The core engine that evaluates a ProblemSpec and produces an ExecutionTrace.

It has no knowledge of the UI.

---

## Execution Trace

An immutable ordered list of TraceEvents representing the complete execution of
an algorithm.

The ExecutionTrace is the single source of truth for all visualizations.

---

## Trace Event

One atomic event within an ExecutionTrace.

Examples:

- CALL
- READ
- WRITE
- TRANSITION
- RETURN
- MEMO_HIT
- BASE_CASE
- COMPLETE

---

## Execution Frame

A deterministic snapshot derived from an ExecutionTrace.

The UI renders only ExecutionFrames.

ExecutionFrames are immutable.

---

## Playback Engine

A deterministic state machine that converts an ExecutionTrace into a sequence of
ExecutionFrames.

It supports stepping, seeking and playback but performs no algorithmic work.

---

## Visualization Layer

The React application responsible for rendering ExecutionFrames.

It never executes algorithms or reconstructs algorithmic state from scratch.

---

## Dependency

A relationship indicating that one state requires another state's value.

Dependencies are discovered through READ events.

---

## Memoization

Reuse of a previously computed state.

A memoized lookup emits a MEMO_HIT event instead of recursively evaluating the
subproblem again.

---

## Recursion Tree

A visualization of recursive function calls.

Dead branches fade to gray.

The currently explored branch is highlighted in orange/red.

---

## DP Table

A visual representation of computed states.

Colors communicate execution status rather than only stored values.

---

## Playback

Navigation through an ExecutionTrace.

Supported actions include:

- Next
- Previous
- Seek
- Reset
- Variable playback speed

---

## Template

A built-in implementation of a ProblemSpec.

Examples:

- Fibonacci
- 0/1 Knapsack
- LCS
- Grid Paths

Templates define the mathematics; the engine performs the execution.

---

## MVP

The first production milestone.

Supports:

- Built-in templates
- Top-down and bottom-up execution
- Execution traces
- Playback
- DP table visualization
- Recursion tree
- Explanation panel

The MVP intentionally excludes:

- Natural-language parsing
- Code parsing
- User accounts
- Databases
- LLM dependency

---

## Design Philosophy

The project follows one core principle:

ProblemSpec
↓
Execution Engine
↓
ExecutionTrace
↓
Playback Engine
↓
ExecutionFrame
↓
Visualization

Every new feature should fit naturally into this pipeline rather than bypass it.
