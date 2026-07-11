# Frame Specification

An `ExecutionFrame` is the complete, immutable application state for one
instant in time. It is computed by the Playback Engine from the
`ExecutionTrace` on each navigation step.

**The Visualization Layer renders exclusively from an `ExecutionFrame`. It
never reads `ExecutionTrace` directly.**

A frame at index `i` reflects the state **after** applying event `i`. This
means `seek(lastIndex)` always produces the complete final state, and every
event (including `CALL` and `WRITE`) is visible at the frame where it occurs.

## Interface

```typescript
interface ExecutionFrame {
  /** Index into ExecutionTrace.events for this frame (0-based). */
  frameIndex: number;

  /** The event at this frame. */
  currentEvent: TraceEvent;

  /**
   * Metadata required to render generic DP tables without reading
   * ExecutionTrace directly.
   */
  table: DPTableMetadata;

  /**
   * All DP cells filled so far, keyed by StateKey.
   * Updated by both WRITE events and BASE_CASE events (see Derivation Rules).
   */
  dpSnapshot: ReadonlyMap<StateKey, number>;

  /**
   * Active call chain — top-down mode only.
   * Ordered outermost-first. Contains the StateKey of every CALL that has
   * been entered but not yet resolved (no RETURN / BASE_CASE / MEMO_HIT
   * terminal). Always an empty array in bottom-up mode.
   */
  callStack: readonly StateKey[];

  /**
   * Recursion tree snapshot — top-down mode only; null in bottom-up mode.
   * Contains all CALL nodes seen up to and including frameIndex, each with
   * their resolved outcome (if already resolved) or null if still open.
   * When null, the Visualization Layer hides the recursion tree panel.
   */
  recursionTree: RecursionTree | null;

  /**
   * The event id of the deepest open CALL at this frame.
   * null in bottom-up mode or before the first CALL.
   */
  activeNodeId: number | null;

  /**
   * Cells to highlight in the DP table at this frame.
   * Derived from currentEvent (see Derivation Rules).
   */
  highlightedCells: readonly HighlightedCell[];

  /**
   * For TRANSITION events: the StateKey of each cell that was READ during
   * this transition, resolved from TRANSITION.usedReads.
   * Empty array for all other event types.
   *
   * This is the only frame field whose value cannot be trivially derived
   * from currentEvent alone — it requires a lookup into earlier READ events.
   * Providing it here means the Visualization Layer never needs to scan the
   * trace directly.
   */
  resolvedDependencies: readonly StateKey[];

  /** true if frameIndex === 0. */
  isFirst: boolean;
  /** true if currentEvent.type === "COMPLETE". */
  isLast: boolean;
  /** Total number of frames (= trace.events.length). */
  totalFrames: number;
}
```

## Supporting Types

```typescript
type StateKey = string; // coordinates joined with commas, e.g. "3,7"
// matches the serialisation used by the Execution Engine

interface HighlightedCell {
  state: StateKey;
  role: "active" | "dependency" | "memo-hit" | "base-case";
}

interface DPTableMetadata {
  /** Axis names, copied from ExecutionTrace.stateVariables. */
  stateVariables: readonly string[];
  /** Axis sizes for this concrete input, copied from ExecutionTrace.dimensions. */
  dimensions: readonly number[];
}

interface RecursionTree {
  /** All call nodes seen up to frameIndex, keyed by CALL event id. */
  nodes: ReadonlyMap<number, RecursionNode>;
  /** Event id of the root CALL node (parentId === null). */
  rootId: number;
}

interface RecursionNode {
  /** id of the CALL event that opened this node. */
  callEventId: number;
  /** id of the parent CALL event; null for the root. */
  parentCallId: number | null;
  /** The DP state this call is computing. */
  state: StateKey;
  /**
   * Resolved outcome once a terminal event has been seen for this call,
   * or null if the call is still open at this frame.
   */
  outcome: "return" | "memo-hit" | "base-case" | null;
  /** id of the terminal event; null if still open. */
  terminalEventId: number | null;
  /** Resolved value; null if still open. */
  value: number | null;
}
```

## Field Derivation Rules

The rules below define exactly how each field is computed from the event stream.
All rules are stated as "replay events 0 through frameIndex (inclusive)."

### `dpSnapshot`

Replay `WRITE` events **and** `BASE_CASE` events. Both update the snapshot:

- `WRITE { state, value }` — `snapshot.set(state, value)`
- `BASE_CASE { state, value }` — `snapshot.set(state, value)`

**Rationale.** In top-down mode, base-case states are memoized via their
`BASE_CASE` event — no separate `WRITE` is emitted for them. Including
`BASE_CASE` in the snapshot rule keeps table rendering consistent across both
execution modes: a base-case cell is "filled" at the moment its `BASE_CASE`
event fires.

### `table`

Copy immutable table metadata from the trace:

- `stateVariables = trace.stateVariables`
- `dimensions = trace.dimensions`

**Rationale.** The Visualization Layer renders exclusively from
`ExecutionFrame` and never reads `ExecutionTrace` directly. Generic DP table
rendering needs to know the full state-space dimensions so it can render both
computed cells and unknown/uncomputed cells. Carrying this lightweight metadata
in the frame preserves that boundary without adding algorithmic responsibility
to the UI.

### `callStack`

Scan events in order:

- `CALL` — push `state`
- `RETURN` / `BASE_CASE` / `MEMO_HIT` — pop the top of the stack

Empty in bottom-up mode (no `CALL` events are emitted).

### `recursionTree`

Scan events in order:

- `CALL { id, parentId, state }` — add a new `RecursionNode` with
  `callEventId = id`, `parentCallId = parentId`, `state`, `outcome = null`.
  If `parentId === null`, set `rootId = id`.

- `RETURN { id, state, value }` — find the node for this call; set
  `outcome = "return"`, `terminalEventId = id`, `value`.

- `BASE_CASE { id, state, value }` (top-down only) — same lookup; set
  `outcome = "base-case"`, `terminalEventId = id`, `value`.

- `MEMO_HIT { id, state, value }` — same lookup; set
  `outcome = "memo-hit"`, `terminalEventId = id`, `value`.
  **`MEMO_HIT` nodes appear in the tree as leaf nodes** — they are never
  suppressed. Seeing a memo hit as a short-circuited leaf is part of the
  pedagogical goal of the top-down visualization.

`null` in bottom-up mode (the trace contains no `CALL` events).

### `activeNodeId`

The `callEventId` of the deepest open `RecursionNode` at this frame (i.e., the
node at the top of the call stack). Derived from `callStack` — look up the most
recently pushed `StateKey` in `recursionTree.nodes` to retrieve its
`callEventId`. `null` in bottom-up mode.

### `highlightedCells`

| `currentEvent.type` | Highlights produced                                                                 |
| ------------------- | ----------------------------------------------------------------------------------- |
| `CALL`              | `active` — the called state                                                         |
| `MEMO_HIT`          | `memo-hit` — the hit state                                                          |
| `BASE_CASE`         | `base-case` — the base state                                                        |
| `READ`              | `dependency` — the read state                                                       |
| `TRANSITION`        | `active` — the computed state; `dependency` — every state in `resolvedDependencies` |
| `WRITE`             | `active` — the written state                                                        |
| `RETURN`            | `active` — the returned state                                                       |
| `COMPLETE`          | (empty — no per-cell highlight)                                                     |

### `resolvedDependencies`

Only non-empty for `TRANSITION` events. For a `TRANSITION { usedReads }`:
scan `trace.events[0..frameIndex]` to find each `READ` event whose `id` is in
`usedReads`, and collect their `state` values in order.

This is the only derivation that requires looking beyond `currentEvent`. It is
computed by the Playback Engine so the Visualization Layer never scans the
trace directly.

### `isFirst` / `isLast`

- `isFirst = (frameIndex === 0)`
- `isLast = (currentEvent.type === "COMPLETE")`
