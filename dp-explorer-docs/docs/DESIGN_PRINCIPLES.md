# Design Principles

1. The frontend never computes algorithmic logic. If a visualization needs
   information the trace doesn't carry, enrich the trace schema — never
   recompute in a component.

2. Execution traces are immutable.

3. Every visualization derives only from the current playback frame.

4. The Execution Engine has zero UI knowledge — enforced structurally by
   living in a package (`packages/core`) that never imports UI code, not
   just by convention.

5. Every supported algorithm reduces to a common
   State → Transition → Evaluation → Result abstraction, expressed as a
   `ProblemSpec` (see `docs/PROBLEM_SPEC.md`). Template authors supply only
   the math — dimensions, base case, transition, answer extraction. The
   engine owns iteration, recursion, memoization, and event emission.

6. The engine is generic, not per-template. A new template is a new
   `ProblemSpec` value, never new engine code. This is proven by a build
   milestone (Roadmap Stage 3: two problems of different dimensionality
   through one unchanged engine), not assumed.

7. One specification, two execution modes. `runTopDown` and `runBottomUp`
   consume the exact same `ProblemSpec`. Neither mode is a special case
   requiring spec changes.

8. Trace events carry provenance, not just values. A `TRANSITION` records
   which `READ` events produced it; a `CALL` records its parent. Nothing
   about "why" a value exists should require recomputation to answer.

9. AI is optional. The application must remain usable without any LLM
   integration.

10. Components communicate through well-defined interfaces (`ProblemSpec`,
    `TraceEvent`, playback frame) — never through shared mutable state.

11. Favor deterministic execution over AI-generated visualization.

12. Boundaries are explicit, not silent. Where the model doesn't yet reach
    (tree/graph DP, arbitrary code parsing), that's documented as a stated
    non-goal (`docs/ARCHITECTURE.md` → Boundaries), not discovered later as
    a bug.
