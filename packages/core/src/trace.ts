import type { StateKey } from "./state-key";

/**
 * Execution mode for an execution trace.
 *
 * The mode belongs to execution, not to template authoring. Functional
 * specifications support top-down and bottom-up execution, while propagation
 * specifications have their own transition-driven runtime.
 */
export type ExecutionMode = "top-down" | "bottom-up" | "propagation";

/**
 * Trace event discriminants. The string values are the canonical event names
 * used in the architecture documents.
 */
export const EventType = {
  Call: "CALL",
  MemoHit: "MEMO_HIT",
  BaseCase: "BASE_CASE",
  Read: "READ",
  Transition: "TRANSITION",
  Write: "WRITE",
  Return: "RETURN",
  PropagationSeed: "PROPAGATION_SEED",
  PropagationProcess: "PROPAGATION_PROCESS",
  PropagationTransition: "PROPAGATION_TRANSITION",
  PropagationUpdate: "PROPAGATION_UPDATE",
  PropagationComplete: "PROPAGATION_COMPLETE",
  Complete: "COMPLETE"
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Monotonic logical-time id assigned to every trace event.
 */
export type TraceEventId = number;

/**
 * Common event fields shared by all trace entries.
 */
export interface TraceEventBase {
  readonly id: TraceEventId;
  readonly type: EventType;
}

/**
 * A top-down call has entered a state.
 */
export interface CallTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Call;
  readonly state: StateKey;
  readonly depth: number;
  readonly parentId: TraceEventId | null;
}

/**
 * A top-down call resolved from memoized state.
 */
export interface MemoHitTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.MemoHit;
  readonly state: StateKey;
  readonly value: number;
  readonly parentId: TraceEventId;
}

/**
 * A state resolved directly from a base-case rule.
 */
export interface BaseCaseTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.BaseCase;
  readonly state: StateKey;
  readonly value: number;
  readonly parentId: TraceEventId | null;
}

/**
 * A transition or answer extraction read another state's value.
 */
export interface ReadTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Read;
  readonly state: StateKey;
  readonly value: number;
  readonly requestedFor: StateKey | "ANSWER";
}

/**
 * A non-base state was evaluated from prior reads.
 */
export interface TransitionTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Transition;
  readonly state: StateKey;
  readonly usedReads: readonly TraceEventId[];
  readonly value: number;
}

/**
 * A computed value was written to the DP table/memo store.
 */
export interface WriteTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Write;
  readonly state: StateKey;
  readonly value: number;
}

/**
 * A top-down call returned a computed value.
 */
export interface ReturnTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Return;
  readonly state: StateKey;
  readonly value: number;
  readonly parentId: TraceEventId | null;
}

/** A value explicitly seeded before propagation begins. */
export interface PropagationSeedTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.PropagationSeed;
  readonly state: StateKey;
  readonly value: number;
}

/** A scheduled state has begun distributing its current value. */
export interface PropagationProcessTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.PropagationProcess;
  readonly state: StateKey;
  readonly value: number;
}

/** A processed source emitted one contribution toward a destination state. */
export interface PropagationTransitionTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.PropagationTransition;
  readonly processId: TraceEventId;
  readonly source: StateKey;
  readonly target: StateKey;
  readonly contribution: number;
}

/** Whether an update established a state or combined with its existing value. */
export type PropagationUpdateOperation = "initialize" | "aggregate";

/**
 * A destination state received a contribution and now holds its updated value.
 * `previousValue` is null when this is the first value established for target.
 */
export interface PropagationUpdateTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.PropagationUpdate;
  readonly processId: TraceEventId;
  readonly source: StateKey;
  readonly target: StateKey;
  readonly previousValue: number | null;
  readonly contribution: number;
  readonly updatedValue: number;
  readonly operation: PropagationUpdateOperation;
}

/** A processed state has emitted all of its scheduled successor updates. */
export interface PropagationCompleteTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.PropagationComplete;
  readonly processId: TraceEventId;
  readonly state: StateKey;
  readonly value: number;
}

/**
 * The trace reached its final answer.
 */
export interface CompleteTraceEvent extends TraceEventBase {
  readonly type: typeof EventType.Complete;
  readonly answer: number;
}

/**
 * One atomic event in an immutable execution trace.
 */
export type TraceEvent =
  | CallTraceEvent
  | MemoHitTraceEvent
  | BaseCaseTraceEvent
  | ReadTraceEvent
  | TransitionTraceEvent
  | WriteTraceEvent
  | ReturnTraceEvent
  | CompleteTraceEvent;

/** One atomic event in a propagation execution trace. */
export type PropagationTraceEvent =
  | PropagationSeedTraceEvent
  | PropagationProcessTraceEvent
  | PropagationTransitionTraceEvent
  | PropagationUpdateTraceEvent
  | PropagationCompleteTraceEvent
  | CompleteTraceEvent;

/**
 * Immutable event log emitted by the Execution Engine.
 *
 * Every downstream visualization must derive from this data through playback
 * frames, never by recomputing DP logic.
 */
export interface ExecutionTrace<Input = unknown> {
  readonly problemId: string;
  readonly mode: Exclude<ExecutionMode, "propagation">;
  readonly input: Input;
  readonly stateVariables: readonly string[];
  readonly dimensions: readonly number[];
  readonly events: readonly TraceEvent[];
}

/** Immutable trace emitted by the propagation execution model. */
export interface PropagationExecutionTrace<Input = unknown> {
  readonly problemId: string;
  readonly mode: "propagation";
  readonly input: Input;
  readonly stateVariables: readonly string[];
  readonly dimensions: readonly number[];
  readonly events: readonly PropagationTraceEvent[];
}
