# Architecture

## Repo Layout

DP Explorer is a small monorepo. The Execution Engine has zero UI knowledge —
this is enforced structurally, not just by convention: it lives in a package
that never imports React and can run in plain Node.

```
dp-explorer/
├── packages/
│   ├── core/          # Problem Specification types, Execution Engine, Trace types,
│   │                  # Statistics utilities. Pure TS. No DOM, no React.
│   ├── playback/      # Playback Engine + ExecutionFrame builder.
│   │                  # Depends only on core's trace types. No React.
│   └── templates/     # Built-in ProblemSpecs (Fibonacci, Knapsack, LCS, Grid Paths)
│                      # Depends only on core.
└── apps/
    └── web/           # React + Vite. Visualization Layer only.
                       # Depends on core + playback + templates.
                       # Contains zero algorithmic logic.
```

Specification documents for each component:

| Spec | Covers |
|---|---|
| `docs/PROBLEM_SPEC.md` | `ProblemSpec` interface and template authoring contract |
| `docs/EXECUTION_TRACE_SPEC.md` | `TraceEvent` schema, event-sequence rules, worked examples |
| `docs/PLAYBACK_SPEC.md` | `PlaybackController` behavioral contract |
| `docs/FRAME_SPEC.md` | `ExecutionFrame` interface and field-derivation rules |
| `docs/UI_SPEC.md` | Visualization layer layout, visual language, interactions |
| `docs/CODEX_GUIDE.md` | Implementation conventions for contributors |

## Core Components

### 1. Problem Specification (`packages/core`)

A declarative description of a DP problem's state space, base cases, and
recurrence — see `docs/PROBLEM_SPEC.md` for the full schema.

Template authors supply *only* the math (dimensions, base case, transition,
how to read the answer). They never write loops or recursion — the engine
owns that, which is what keeps this an engine rather than a set of
hand-animated demos.

Eventually generated from (future, not MVP):
- Built-in templates ← MVP scope
- User-defined state descriptions
- LLM
- Parsed code

### 2. Execution Engine (`packages/core`)

Input: a `ProblemSpec`, concrete input values, and a chosen mode.

Output: an `ExecutionTrace`.

Two entry points, same spec:

- `runTopDown(spec, input): ExecutionTrace`
- `runBottomUp(spec, input): ExecutionTrace`

Responsibilities:
- Walk the state space (recursively or iteratively, per mode)
- In bottom-up mode: check `baseCase` before calling `transition` for every
  state yielded by `iterationOrder`. Base-case states emit `BASE_CASE + WRITE`
  and bypass `transition`. Non-base states proceed through `READ* + TRANSITION
  + WRITE`.
- Instrument every `read()` call the spec makes, emitting trace events with
  full provenance
- Validate bottom-up iteration order at runtime (a read of an unwritten cell
  is a spec bug — the engine throws immediately rather than the UI silently
  showing an empty cell)
- Zero UI knowledge, zero rendering concerns

### 3. Execution Trace (`packages/core`)

An immutable, ordered list of events — the single source of truth for every
visualization. See `docs/EXECUTION_TRACE_SPEC.md`.

Every derived value (a cell's contents, why a cell has that value, whether a
call was a memo hit) must be answerable by reading the trace, never by
recomputing spec logic in the UI.

### 4. Statistics Utilities (`packages/core`)

Pure functions that scan the `ExecutionTrace` up to a given event index and
return running counts. They live in `packages/core` because they are pure
functions of the trace data — no UI knowledge required.

```typescript
// All exported from packages/core
function countCalls(events: TraceEvent[], upToIndex: number): number;
function countMemoHits(events: TraceEvent[], upToIndex: number): number;
function countBaseCases(events: TraceEvent[], upToIndex: number): number;
```

The **Visualization Layer** calls these helpers directly with the current
frame index. The **Playback Engine** does not own, cache, or pre-compute
statistics — they are computed on-demand by the UI. This keeps the Playback
Engine a pure deterministic state machine.

### 5. Playback Engine (`packages/playback`)

Responsible for:
- Next / Previous / Seek

A pure, deterministic state machine over `(trace, currentIndex)`. It never
executes algorithms, and it never knows what a "Knapsack" or a "table" is —
it only knows about event indices.

On each navigation call the Playback Engine computes and returns an immutable
`ExecutionFrame` — the complete snapshot the Visualization Layer renders from.
Frame computation is **idempotent**: the same trace and the same index always
produce the same frame regardless of the sequence of prior navigation calls.

How the engine is driven — timers, `requestAnimationFrame`, manual stepping in
tests — is the responsibility of the caller. The Playback Engine has no opinion
on timing and owns no lifecycle.

See `docs/PLAYBACK_SPEC.md` for the `PlaybackController` behavioral contract.

### 6. Execution Frame (`packages/playback`)

An `ExecutionFrame` is the complete, immutable application state for one
instant in time. It is computed by the Playback Engine from the trace on each
navigation step and consumed exclusively by the Visualization Layer.

A frame at index `i` reflects the state **after** applying event `i`. This
means `seek(lastIndex)` always produces the complete final state, and every
event type (including `CALL` and `WRITE`) is "visible" at the frame where it
occurs.

See `docs/FRAME_SPEC.md` for the full `ExecutionFrame` interface and
field-derivation rules.

### 7. Visualization Layer (`apps/web`)

Receives the current `ExecutionFrame` from the Playback Engine and renders:

- **DP table** (1D and 2D — dimension count comes from
  `frame.table.dimensions.length`; the Playback Engine copies this table
  metadata from the trace into each frame so the Visualization Layer never
  reads `ExecutionTrace` directly)
- **Recursion tree** (top-down mode only — `frame.recursionTree` is `null` in
  bottom-up mode, so this panel is hidden)
- **Explanation panel** — template-driven: a static map of explanation
  templates keyed by `TraceEvent.type` lives in `apps/web`. For each event
  type, the template is populated with fields already present in
  `frame.currentEvent` and `frame.resolvedDependencies` (the cell coordinates
  of any `READ` events referenced by a `TRANSITION`). No DP logic is
  recomputed — all required data is already present in the frame.
- **Timeline**
- **Statistics** — computed on-demand by calling helper utilities from
  `packages/core` with `frame.frameIndex`. Not pre-computed in the frame.

No algorithmic computation happens inside the UI. If a visualization needs
information the trace doesn't carry, the fix is to enrich the trace schema —
never to recompute in the component.

## Data Flow

```
Problem Specification
        ↓
Execution Engine (runTopDown / runBottomUp)
        ↓
Execution Trace (immutable event log)
        ↓
Playback Engine
        ↓
Execution Frame (immutable per-step snapshot)
        ↓
Visualization Layer
```

Statistics utilities (`packages/core`) are called by the Visualization Layer
as pure functions of the trace; they are not part of the main pipeline.

## Boundaries (explicit, not silent)

- **State is a coordinate vector (`number[]`).** This generalizes cleanly
  across 1D, 2D, 3D+, bitmask DP (mask as an integer axis), digit DP, and
  interval/partial-grid DP (`iterationOrder` only yields valid states, so
  triangular tables are fine). It does **not** cover Tree DP or Graph DP,
  where the natural state is a node reference rather than a coordinate. That
  is future work (see `docs/ROADMAP.md`), not an MVP gap.
- **No backend for MVP.** Specs are trusted, authored code (not
  user-submitted code), so the whole pipeline runs client-side. A backend
  only becomes necessary for future "arbitrary user code" parsing, where
  sandboxed execution is a real concern.
- **Input sizes are capped** per-template (see `docs/PROBLEM_SPEC.md` →
  `InputField`) to keep traces small enough for smooth scrubbing. This is a
  teaching tool, not a solver for production-sized inputs.

## Future Work

- **Dependency graph** — A dependency graph may be derived from the trace to
  power solution reconstruction, state-dependency visualization, heatmaps,
  and advanced graph-based visualizations. Not required for MVP.
- **Tree DP / Graph DP** — requires a node-reference-based state model,
  distinct from the current coordinate-vector model (see `docs/ROADMAP.md`).
- **Natural language → DP specification** and **arbitrary code parsing** —
  would require a backend for sandboxed execution; post-MVP.
