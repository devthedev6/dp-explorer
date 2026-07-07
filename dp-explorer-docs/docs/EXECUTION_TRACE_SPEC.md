# Execution Trace Specification

An Execution Trace is an immutable, ordered list of events — the single
source of truth for every visualization. If a visualization needs
information the trace doesn't carry, the fix is to enrich this schema, not
to recompute logic in the UI.

## Trace shape

```typescript
interface ExecutionTrace {
  problemId: string;
  mode: "top-down" | "bottom-up";
  input: unknown;
  stateVariables: string[];   // e.g. ["i", "j"]
  dimensions: number[];       // axis sizes for this concrete input
  events: TraceEvent[];
}
```

## Event types

```typescript
type StateKey = string; // coordinates joined, e.g. "3,7"

type TraceEvent =
  | { id: number; type: "CALL"; state: StateKey; depth: number; parentId: number | null }
  | { id: number; type: "MEMO_HIT"; state: StateKey; value: number; parentId: number }
  | { id: number; type: "BASE_CASE"; state: StateKey; value: number; parentId: number | null }
  | { id: number; type: "READ"; state: StateKey; value: number; requestedFor: StateKey | "ANSWER" }
  | { id: number; type: "TRANSITION"; state: StateKey; usedReads: number[]; value: number }
  | { id: number; type: "WRITE"; state: StateKey; value: number }
  | { id: number; type: "RETURN"; state: StateKey; value: number; parentId: number | null }
  | { id: number; type: "COMPLETE"; answer: number };
```

Key design choices, spelled out so an implementer never has to guess:

- **`id` is a monotonic sequence number**, doubling as logical time — the
  Playback Engine seeks by index into `events`, never by wall-clock time.
- **`TRANSITION.usedReads`** is a list of `READ` event ids, not raw values.
  This is what lets the Explanation Panel say "this cell's value came from
  reading these exact cells" without recomputing anything — it's a lookup
  into events already in the trace.
- **`parentId`** links a `CALL` to whichever call triggered it (`null` for
  the outermost call kicked off by `extractAnswer`). This is what the
  recursion tree is built from, and it only appears in top-down mode.

## Per-call state machine (top-down mode)

Every `ctx.read(state)` in top-down mode resolves through this exact
sequence:

```
CALL(state)
  → MEMO_HIT(state, value)              [terminal — already computed]
  → BASE_CASE(state, value)              [terminal — spec.baseCase matched]
  → READ*, TRANSITION(usedReads, value), WRITE(state, value), RETURN(state, value)
                                          [terminal — computed via transition]
```

Every `CALL` has exactly one terminal event among
`{MEMO_HIT, BASE_CASE, RETURN}`. This invariant is what lets the
visualization layer match calls to their outcomes reliably — worth a
dedicated unit test in `packages/core`.

## Bottom-up mode

No `CALL` / `MEMO_HIT` / `RETURN` are ever emitted — there is no call stack.
For each state in `iterationOrder(input)`:

```
READ* (for each ctx.read in transition), TRANSITION(usedReads, value), WRITE(state, value)
```

If `transition` calls `ctx.read` on a state not yet written, the engine
throws immediately (this indicates `iterationOrder` doesn't respect
dependency order — a spec bug, not a runtime/UI concern).

## Closing the trace

Both modes end with:

```
COMPLETE(answer)
```

reached by calling `spec.extractAnswer(input, read)`. In top-down mode,
calling `read()` inside `extractAnswer` is what kicks off the very first
`CALL` — there is no separate "root state" concept. In bottom-up mode, it's
a final table lookup after the loop in `iterationOrder` has already filled
every cell. Any reads `extractAnswer` performs still emit `READ` events,
tagged `requestedFor: "ANSWER"`.

## Worked example (top-down, Fibonacci, n = 3, abridged)

```
CALL          { id: 0,  state: "3", depth: 0, parentId: null }
  CALL        { id: 1,  state: "2", depth: 1, parentId: 0 }
    CALL      { id: 2,  state: "1", depth: 2, parentId: 1 }
    BASE_CASE { id: 3,  state: "1", value: 1, parentId: 1 }
    CALL      { id: 4,  state: "0", depth: 2, parentId: 1 }
    BASE_CASE { id: 5,  state: "0", value: 0, parentId: 1 }
  READ        { id: 6,  state: "1", value: 1, requestedFor: "2" }
  READ        { id: 7,  state: "0", value: 0, requestedFor: "2" }
  TRANSITION  { id: 8,  state: "2", usedReads: [6,7], value: 1 }
  WRITE       { id: 9,  state: "2", value: 1 }
  RETURN      { id: 10, state: "2", value: 1, parentId: 0 }
  CALL        { id: 11, state: "1", depth: 1, parentId: 0 }
  MEMO_HIT    { id: 12, state: "1", value: 1, parentId: 0 }
READ          { id: 13, state: "2", value: 1, requestedFor: "3" }
READ          { id: 14, state: "1", value: 1, requestedFor: "3" }
TRANSITION    { id: 15, state: "3", usedReads: [13,14], value: 2 }
WRITE         { id: 16, state: "3", value: 2 }
RETURN        { id: 17, state: "3", value: 2, parentId: null }
COMPLETE      { id: 18, answer: 2 }
```

Every downstream visualization — table, tree, explanation text, stats —
reads only from a list like this.

## Worked example (bottom-up, Fibonacci, n = 3, complete)

In bottom-up mode `CALL`, `MEMO_HIT`, and `RETURN` are never emitted.
For each state yielded by `iterationOrder`, the engine checks `baseCase`
first:
- **Base-case state** — emit `BASE_CASE + WRITE`, skip `transition`.
- **Non-base state** — call `transition` (emitting `READ` events per
  `ctx.read` call), then emit `TRANSITION + WRITE`.

```
BASE_CASE  { id: 0,  state: "0", value: 0, parentId: null }
WRITE      { id: 1,  state: "0", value: 0 }
BASE_CASE  { id: 2,  state: "1", value: 1, parentId: null }
WRITE      { id: 3,  state: "1", value: 1 }
READ       { id: 4,  state: "0", value: 0, requestedFor: "2" }
READ       { id: 5,  state: "1", value: 1, requestedFor: "2" }
TRANSITION { id: 6,  state: "2", usedReads: [4, 5], value: 1 }
WRITE      { id: 7,  state: "2", value: 1 }
READ       { id: 8,  state: "1", value: 1, requestedFor: "3" }
READ       { id: 9,  state: "2", value: 1, requestedFor: "3" }
TRANSITION { id: 10, state: "3", usedReads: [8, 9], value: 2 }
WRITE      { id: 11, state: "3", value: 2 }
READ       { id: 12, state: "3", value: 2, requestedFor: "ANSWER" }
COMPLETE   { id: 13, answer: 2 }
```

Key differences from top-down:
- No `CALL` / `MEMO_HIT` / `RETURN` events — there is no call stack.
- `BASE_CASE` events appear and are immediately followed by `WRITE`.
  `parentId` is always `null` in bottom-up (there is no caller).
- The engine does **not** call `transition` on base-case states.
- `extractAnswer` still emits `READ` events tagged `requestedFor: "ANSWER"`.

## `MEMO_HIT` in the Recursion Tree

A `MEMO_HIT` event appears in the recursion tree as a **leaf node** with
`outcome = "memo-hit"`. It is rendered with a distinct visual treatment (see
`docs/UI_SPEC.md` — _Memoization hit_) but is **never suppressed**. Seeing
a memo hit as a short-circuited leaf — rather than a recursive subtree — is
part of the pedagogical goal of the top-down visualization.

`MEMO_HIT` does **not** carry a `depth` field. If tree-layout depth is
needed, use the parent `CALL` event's `depth + 1`.

For statistics:
- `callCount` = number of `CALL` events. A call that resolves as a
  `MEMO_HIT` still counts (the call was made; it just returned from cache).
- `memoHitCount` = number of `MEMO_HIT` events.

## `BASE_CASE` and `dpSnapshot` (top-down mode)

In top-down mode, base-case states are memoized at the moment their
`BASE_CASE` event fires — no separate `WRITE` is emitted. The `dpSnapshot`
must therefore update on **both** `WRITE` and `BASE_CASE` events. This
ensures base-case cells appear as filled in the DP table immediately when
they are encountered, with no special-casing required by the Visualization
Layer. See `docs/FRAME_SPEC.md` — _dpSnapshot derivation_.
