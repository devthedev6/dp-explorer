# DP Explorer

> Understand Dynamic Programming by watching algorithms think.

## What this is

DP Explorer is a software engine for visualizing the execution of Dynamic
Programming algorithms — not a fixed set of pre-animated demos. A generic
Execution Engine reads a declarative Problem Specification and produces an
immutable Execution Trace. Every visualization (table, recursion tree,
timeline, explanations) is derived purely from that trace. No UI code ever
computes DP logic.

Core idea: **State → Transition → Evaluation → Result** — and the engine can
walk that abstraction in two different execution modes for the *same*
problem specification:

- **Top-down** — memoized recursion (produces a call tree + memo hits)
- **Bottom-up** — iterative tabulation (produces the same table, no call stack)

Watching one algorithm reasoned about both ways, side by side, is one of the
project's core pedagogical goals.

## Core Architecture

```
Problem Specification
        ↓
Execution Engine (top-down and/or bottom-up)
        ↓
Execution Trace (immutable event log)
        ↓
Playback Engine (next/prev/seek/play/pause/speed)
        ↓
Visualization Layer (table, recursion tree, timeline, explanations)
```

See `docs/ARCHITECTURE.md` for component responsibilities and repo layout,
`docs/PROBLEM_SPEC.md` for the declarative spec format, and
`docs/EXECUTION_TRACE_SPEC.md` for the trace event schema.

## Planned Features (MVP)

- Step-by-step execution, both modes
- DP table visualization (1D and 2D)
- Recursive call tree (top-down mode)
- Timeline controls (play/pause/seek/speed)
- Explanation panel (derived from trace provenance, no recomputation)
- Built-in templates: Fibonacci, 0/1 Knapsack, LCS, Grid Paths

## Explicit Non-Goals (for now)

- Authentication, accounts, database — MVP is stateless and client-side
- Tree DP / Graph DP — state is currently a coordinate vector, not a node
  reference (see `docs/ARCHITECTURE.md` → Boundaries)
- Natural-language-to-DP, arbitrary code parsing — real future goals, not MVP

## Status

Pre-implementation. See `docs/ROADMAP.md` for the staged build plan.
