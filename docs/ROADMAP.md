# Roadmap

Each stage is scoped to be handed to a coding agent as one self-contained
prompt, with a clear, testable "done" condition.

## Stage 1 — Repo scaffold

pnpm workspace: `packages/core`, `packages/playback`, `packages/templates`,
`apps/web`. TypeScript strict mode, Vitest, Vite. No logic yet.
**Done when:** clean install, build, and empty test suite all pass across
every package.

## Stage 2 — Core types

`ProblemSpec`, `TransitionCtx`, `InputField`, `TraceEvent`, `ExecutionTrace`
(see `docs/PROBLEM_SPEC.md`, `docs/EXECUTION_TRACE_SPEC.md`) in
`packages/core`. Types and input validation only — no engine execution yet.
**Done when:** the Fibonacci and Knapsack specs from `docs/PROBLEM_SPEC.md`
both type-check against `ProblemSpec` with no `any`.

## Stage 3 — Engine core: Fibonacci (1D) + Knapsack (2D), both modes

`runTopDown` and `runBottomUp` in `packages/core`, plus both specs in
`packages/templates`. Golden/snapshot trace tests for all four combinations
(2 problems × 2 modes).
**This is the real gate:** if identical engine code handles a 1-axis and a
2-axis problem in both modes with zero engine changes between them,
genericity is proven, not asserted.

## Stage 4 — Playback Engine

Pure state machine over `(trace, index)`: next / previous / seek. Lives in
`packages/playback`, framework-agnostic, unit-tested with no React involved.
See `docs/PLAYBACK_SPEC.md` for the behavioral contract.

## Stage 5 — Visualization MVP

`apps/web`: timeline controls, 1D table (Fibonacci) and 2D grid table
(Knapsack), recursion tree (top-down), explanation panel (template-driven,
populated from `frame.currentEvent` and `frame.resolvedDependencies`), and a
top-down/bottom-up toggle for the same input.
**First point the whole pipeline is felt end-to-end.**

## Stage 6 — LCS + Grid Paths

New `ProblemSpec` values in `packages/templates`. Should require no engine
or playback changes — if it does, that's a signal Stage 3's design needs
revisiting.

## Stage 7 — Stats, polish, deploy

Call count / memo-hit count / etc., all derived by counting event types in
the trace. Visual polish. Static deploy (no backend needed for MVP).

---

## Future / Post-MVP

- Natural language → DP specification
- Arbitrary code parsing → DP specification
- Tree DP / Graph DP (state as node reference, not coordinate vector — a
  distinct spec model, see `docs/ARCHITECTURE.md` → Boundaries)
- Digit DP, bitmask DP as additional built-in templates (already supported
  by the coordinate-vector state model — no engine changes expected)
- Algorithm evolution & greedy-vs-DP comparison
