import type { EventType, TraceEvent } from "./trace";
import type { StateKey } from "./state-key";

/**
 * Structured explanation payload for an event/frame.
 *
 * The UI may render this data as prose, badges, callouts, or teaching panels,
 * but the domain model keeps it as structured facts rather than plain strings.
 */
export type ExplanationData =
  StateExplanationData | ReadExplanationData | TransitionExplanationData | CompleteExplanationData;

/**
 * Explanation data for events centered on one state.
 */
export interface StateExplanationData {
  readonly kind: "state";
  readonly eventType:
    | typeof EventType.Call
    | typeof EventType.MemoHit
    | typeof EventType.BaseCase
    | typeof EventType.Write
    | typeof EventType.Return;
  readonly state: StateKey;
  readonly value?: number;
  readonly parentId?: number | null;
}

/**
 * Explanation data for a single dependency read.
 */
export interface ReadExplanationData {
  readonly kind: "read";
  readonly eventType: typeof EventType.Read;
  readonly state: StateKey;
  readonly value: number;
  readonly requestedFor: StateKey | "ANSWER";
}

/**
 * Explanation data for a transition and its resolved dependencies.
 */
export interface TransitionExplanationData {
  readonly kind: "transition";
  readonly eventType: typeof EventType.Transition;
  readonly state: StateKey;
  readonly value: number;
  readonly usedReads: readonly number[];
  readonly dependencies: readonly StateKey[];
}

/**
 * Explanation data for final answer completion.
 */
export interface CompleteExplanationData {
  readonly kind: "complete";
  readonly eventType: typeof EventType.Complete;
  readonly answer: number;
}

/**
 * Template metadata keyed by event type.
 *
 * Template text itself belongs to the visualization layer; this type keeps the
 * key and required event shape aligned with the trace contract.
 */
export interface ExplanationTemplate<TEvent extends TraceEvent = TraceEvent> {
  readonly eventType: TEvent["type"];
  readonly requiredFields: readonly (keyof TEvent)[];
}
