import type { PropagationTraceEvent, StateKey, TraceEvent, TraceEventId } from "@dp-explorer/core";

/**
 * Highlight role for a state in the current frame.
 *
 * These roles are semantic playback output, not visual styling. The web app
 * decides how to render each role.
 */
export type HighlightRole = "active" | "dependency" | "memo-hit" | "base-case";

/**
 * A state that should be emphasized for the current event.
 */
export interface HighlightedCell {
  readonly state: StateKey;
  readonly role: HighlightRole;
}

/**
 * Metadata required by generic DP table renderers.
 *
 * This is copied from the trace into each frame so the visualization layer can
 * render unknown cells without reading `ExecutionTrace` directly.
 */
export interface DPTableMetadata {
  readonly stateVariables: readonly string[];
  readonly dimensions: readonly number[];
}

/**
 * Resolved outcome for a recursion-tree call node.
 */
export type RecursionNodeOutcome = "return" | "memo-hit" | "base-case";

/**
 * A single call node in the top-down recursion tree snapshot.
 */
export interface RecursionNode {
  readonly callEventId: TraceEventId;
  readonly parentCallId: TraceEventId | null;
  readonly state: StateKey;
  readonly outcome: RecursionNodeOutcome | null;
  readonly terminalEventId: TraceEventId | null;
  readonly value: number | null;
}

/**
 * Top-down recursion tree derived from trace events up to the frame index.
 *
 * Bottom-up traces have no call stack, so `ExecutionFrame.recursionTree` is
 * `null` for bottom-up mode.
 */
export interface RecursionTree {
  readonly nodes: ReadonlyMap<TraceEventId, RecursionNode>;
  readonly rootId: TraceEventId;
}

/**
 * Complete immutable playback snapshot for one event index.
 *
 * The visualization layer renders this frame exclusively; it should not scan
 * the raw trace directly or recompute DP state.
 */
export interface ExecutionFrame {
  readonly frameIndex: number;
  readonly currentEvent: TraceEvent;
  readonly table: DPTableMetadata;
  readonly dpSnapshot: ReadonlyMap<StateKey, number>;
  readonly callStack: readonly StateKey[];
  readonly recursionTree: RecursionTree | null;
  readonly activeNodeId: TraceEventId | null;
  readonly highlightedCells: readonly HighlightedCell[];
  readonly resolvedDependencies: readonly StateKey[];
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly totalFrames: number;
}

/** One active propagation edge, including the contribution it carries. */
export interface ActivePropagationTransition {
  readonly processId: TraceEventId;
  readonly source: StateKey;
  readonly target: StateKey;
  readonly contribution: number;
}

/** A state value established or changed by the current propagation event. */
export interface PropagationUpdatedState {
  readonly state: StateKey;
  readonly previousValue: number | null;
  readonly contribution: number | null;
  readonly value: number;
}

/**
 * Immutable playback snapshot for one propagation trace event.
 *
 * The fields are semantic execution facts. Rendering concerns remain outside
 * playback.
 */
export interface PropagationExecutionFrame {
  readonly frameIndex: number;
  readonly currentEvent: PropagationTraceEvent;
  readonly table: DPTableMetadata;
  readonly dpSnapshot: ReadonlyMap<StateKey, number>;
  readonly processedState: StateKey | null;
  readonly activeTransition: ActivePropagationTransition | null;
  readonly updatedState: PropagationUpdatedState | null;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly totalFrames: number;
}

/** A frame emitted by one supported execution model. */
export type PlaybackFrame = ExecutionFrame | PropagationExecutionFrame;
