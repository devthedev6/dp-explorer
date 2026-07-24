import type {
  PropagationExecutionTrace,
  StateKey,
  TraceEvent,
  TraceEventId
} from "@dp-explorer/core";
import { EventType } from "@dp-explorer/core";
import type { ExecutionTrace, ReadTraceEvent } from "@dp-explorer/core";

import type {
  ExecutionFrame,
  HighlightedCell,
  PropagationExecutionFrame,
  RecursionNode,
  RecursionNodeOutcome,
  RecursionTree
} from "./frame";

interface ReplayState {
  readonly dpSnapshot: Map<StateKey, number>;
  readonly callStackStates: StateKey[];
  readonly callStackIds: TraceEventId[];
  readonly recursionNodes: Map<TraceEventId, RecursionNode>;
  readonly rootId: TraceEventId | null;
}

/**
 * Build the immutable frame at `frameIndex` by replaying trace events from the
 * beginning of the trace through that index, inclusive.
 */
export function buildExecutionFrame(trace: ExecutionTrace, frameIndex: number): ExecutionFrame {
  if (trace.events.length === 0) {
    throw new Error("Cannot build an ExecutionFrame for an empty ExecutionTrace.");
  }

  const clampedIndex = clampFrameIndex(frameIndex, trace.events.length);
  const currentEvent = trace.events[clampedIndex];
  if (currentEvent === undefined) {
    throw new Error("Unable to resolve current event for ExecutionFrame.");
  }

  const replay = replayThrough(trace, clampedIndex);
  const resolvedDependencies = resolveDependencies(trace.events, currentEvent);
  const highlightedCells = buildHighlightedCells(currentEvent, resolvedDependencies);
  const recursionTree = buildRecursionTree(trace, replay);
  const activeNodeId = trace.mode === "top-down" ? (replay.callStackIds.at(-1) ?? null) : null;

  return freezeFrame({
    frameIndex: clampedIndex,
    currentEvent,
    table: Object.freeze({
      stateVariables: Object.freeze([...trace.stateVariables]),
      dimensions: Object.freeze([...trace.dimensions])
    }),
    dpSnapshot: freezeReadonlyMap(replay.dpSnapshot),
    callStack: Object.freeze([...replay.callStackStates]),
    recursionTree,
    activeNodeId,
    highlightedCells: Object.freeze(highlightedCells),
    resolvedDependencies: Object.freeze([...resolvedDependencies]),
    isFirst: clampedIndex === 0,
    isLast: currentEvent.type === EventType.Complete,
    totalFrames: trace.events.length
  });
}

interface PropagationReplayState {
  readonly dpSnapshot: Map<StateKey, number>;
  readonly processedState: StateKey | null;
  readonly activeTransition: PropagationExecutionFrame["activeTransition"];
  readonly updatedState: PropagationExecutionFrame["updatedState"];
}

/** Build the immutable propagation frame at `frameIndex` by replaying its trace. */
export function buildPropagationExecutionFrame(
  trace: PropagationExecutionTrace,
  frameIndex: number
): PropagationExecutionFrame {
  if (trace.events.length === 0) {
    throw new Error("Cannot build a PropagationExecutionFrame for an empty propagation trace.");
  }

  const clampedIndex = clampFrameIndex(frameIndex, trace.events.length);
  const currentEvent = trace.events[clampedIndex];
  if (currentEvent === undefined) {
    throw new Error("Unable to resolve current event for PropagationExecutionFrame.");
  }

  const replay = replayPropagationThrough(trace, clampedIndex);
  return freezePropagationFrame({
    frameIndex: clampedIndex,
    currentEvent,
    table: Object.freeze({
      stateVariables: Object.freeze([...trace.stateVariables]),
      dimensions: Object.freeze([...trace.dimensions])
    }),
    dpSnapshot: freezeReadonlyMap(replay.dpSnapshot),
    processedState: replay.processedState,
    activeTransition: freezeActiveTransition(replay.activeTransition),
    updatedState: freezeUpdatedState(replay.updatedState),
    isFirst: clampedIndex === 0,
    isLast: currentEvent.type === EventType.Complete,
    totalFrames: trace.events.length
  });
}

function replayPropagationThrough(
  trace: PropagationExecutionTrace,
  frameIndex: number
): PropagationReplayState {
  const dpSnapshot = new Map<StateKey, number>();
  let processedState: StateKey | null = null;
  let activeTransition: PropagationExecutionFrame["activeTransition"] = null;
  let updatedState: PropagationExecutionFrame["updatedState"] = null;

  for (let index = 0; index <= frameIndex; index += 1) {
    const event = trace.events[index];
    if (event === undefined) {
      throw new Error("Propagation trace replay moved beyond available events.");
    }

    activeTransition = null;
    updatedState = null;

    switch (event.type) {
      case EventType.PropagationSeed:
        dpSnapshot.set(event.state, event.value);
        updatedState = {
          state: event.state,
          previousValue: null,
          contribution: null,
          value: event.value
        };
        break;
      case EventType.PropagationProcess:
        processedState = event.state;
        break;
      case EventType.PropagationTransition:
        activeTransition = {
          processId: event.processId,
          source: event.source,
          target: event.target,
          contribution: event.contribution
        };
        break;
      case EventType.PropagationUpdate:
        activeTransition = {
          processId: event.processId,
          source: event.source,
          target: event.target,
          contribution: event.contribution
        };
        dpSnapshot.set(event.target, event.updatedValue);
        updatedState = {
          state: event.target,
          previousValue: event.previousValue,
          contribution: event.contribution,
          value: event.updatedValue
        };
        break;
      case EventType.PropagationComplete:
        processedState = event.state;
        break;
      case EventType.Complete:
        processedState = null;
        break;
    }
  }

  return { dpSnapshot, processedState, activeTransition, updatedState };
}

function replayThrough(trace: ExecutionTrace, frameIndex: number): ReplayState {
  const dpSnapshot = new Map<StateKey, number>();
  const callStackStates: StateKey[] = [];
  const callStackIds: TraceEventId[] = [];
  const recursionNodes = new Map<TraceEventId, RecursionNode>();
  let rootId: TraceEventId | null = null;

  for (let index = 0; index <= frameIndex; index += 1) {
    const event = trace.events[index];
    if (event === undefined) {
      throw new Error("Trace replay moved beyond available events.");
    }

    if (event.type === EventType.Write || event.type === EventType.BaseCase) {
      dpSnapshot.set(event.state, event.value);
    }

    if (trace.mode !== "top-down") {
      continue;
    }

    switch (event.type) {
      case EventType.Call:
        callStackStates.push(event.state);
        callStackIds.push(event.id);
        recursionNodes.set(
          event.id,
          freezeRecursionNode({
            callEventId: event.id,
            parentCallId: event.parentId,
            state: event.state,
            outcome: null,
            terminalEventId: null,
            value: null
          })
        );
        if (event.parentId === null) {
          rootId = event.id;
        }
        break;
      case EventType.Return:
        resolveTopCall(recursionNodes, callStackIds, event.id, event.value, "return");
        callStackStates.pop();
        callStackIds.pop();
        break;
      case EventType.BaseCase:
        resolveTopCall(recursionNodes, callStackIds, event.id, event.value, "base-case");
        callStackStates.pop();
        callStackIds.pop();
        break;
      case EventType.MemoHit:
        resolveTopCall(recursionNodes, callStackIds, event.id, event.value, "memo-hit");
        callStackStates.pop();
        callStackIds.pop();
        break;
      default:
        break;
    }
  }

  return {
    dpSnapshot,
    callStackStates,
    callStackIds,
    recursionNodes,
    rootId
  };
}

function resolveTopCall(
  recursionNodes: Map<TraceEventId, RecursionNode>,
  callStackIds: readonly TraceEventId[],
  terminalEventId: TraceEventId,
  value: number,
  outcome: RecursionNodeOutcome
): void {
  const callEventId = callStackIds.at(-1);
  if (callEventId === undefined) {
    return;
  }

  const node = recursionNodes.get(callEventId);
  if (node === undefined) {
    return;
  }

  recursionNodes.set(
    callEventId,
    freezeRecursionNode({
      ...node,
      outcome,
      terminalEventId,
      value
    })
  );
}

function buildRecursionTree(trace: ExecutionTrace, replay: ReplayState): RecursionTree | null {
  if (trace.mode !== "top-down" || replay.rootId === null) {
    return null;
  }

  return Object.freeze({
    nodes: freezeReadonlyMap(replay.recursionNodes),
    rootId: replay.rootId
  });
}

function resolveDependencies(
  events: readonly TraceEvent[],
  currentEvent: TraceEvent
): readonly StateKey[] {
  if (currentEvent.type !== EventType.Transition) {
    return [];
  }

  const readsById = new Map<TraceEventId, ReadTraceEvent>();
  for (const event of events) {
    if (event.id > currentEvent.id) {
      break;
    }

    if (event.type === EventType.Read) {
      readsById.set(event.id, event);
    }
  }

  return currentEvent.usedReads.map((readId) => {
    const read = readsById.get(readId);
    if (read === undefined) {
      throw new Error(`Transition references missing READ event id ${readId}.`);
    }

    return read.state;
  });
}

function buildHighlightedCells(
  currentEvent: TraceEvent,
  resolvedDependencies: readonly StateKey[]
): readonly HighlightedCell[] {
  switch (currentEvent.type) {
    case EventType.Call:
    case EventType.Write:
    case EventType.Return:
      return [{ state: currentEvent.state, role: "active" }];
    case EventType.MemoHit:
      return [{ state: currentEvent.state, role: "memo-hit" }];
    case EventType.BaseCase:
      return [{ state: currentEvent.state, role: "base-case" }];
    case EventType.Read:
      return [{ state: currentEvent.state, role: "dependency" }];
    case EventType.Transition:
      return [
        { state: currentEvent.state, role: "active" },
        ...resolvedDependencies.map((state) => ({ state, role: "dependency" }) as const)
      ];
    case EventType.Complete:
      return [];
  }
}

function clampFrameIndex(index: number, totalFrames: number): number {
  if (Number.isNaN(index)) {
    return 0;
  }

  return Math.min(Math.max(Math.trunc(index), 0), totalFrames - 1);
}

function freezeFrame(frame: ExecutionFrame): ExecutionFrame {
  return Object.freeze(frame);
}

function freezePropagationFrame(frame: PropagationExecutionFrame): PropagationExecutionFrame {
  return Object.freeze(frame);
}

function freezeActiveTransition(
  transition: PropagationExecutionFrame["activeTransition"]
): PropagationExecutionFrame["activeTransition"] {
  return transition === null ? null : Object.freeze({ ...transition });
}

function freezeUpdatedState(
  updatedState: PropagationExecutionFrame["updatedState"]
): PropagationExecutionFrame["updatedState"] {
  return updatedState === null ? null : Object.freeze({ ...updatedState });
}

function freezeRecursionNode(node: RecursionNode): RecursionNode {
  return Object.freeze(node);
}

function freezeReadonlyMap<Key, Value>(map: Map<Key, Value>): ReadonlyMap<Key, Value> {
  return Object.freeze(new ReadonlyMapView(map));
}

class ReadonlyMapView<Key, Value> implements ReadonlyMap<Key, Value> {
  readonly #snapshot: ReadonlyMap<Key, Value>;

  constructor(map: Map<Key, Value>) {
    this.#snapshot = new Map(map);
  }

  get size(): number {
    return this.#snapshot.size;
  }

  [Symbol.iterator](): IterableIterator<[Key, Value]> {
    return this.#snapshot[Symbol.iterator]();
  }

  entries(): IterableIterator<[Key, Value]> {
    return this.#snapshot.entries();
  }

  forEach(
    callbackfn: (value: Value, key: Key, map: ReadonlyMap<Key, Value>) => void,
    thisArg?: unknown
  ): void {
    this.#snapshot.forEach((value, key) => callbackfn.call(thisArg, value, key, this));
  }

  get(key: Key): Value | undefined {
    return this.#snapshot.get(key);
  }

  has(key: Key): boolean {
    return this.#snapshot.has(key);
  }

  keys(): IterableIterator<Key> {
    return this.#snapshot.keys();
  }

  values(): IterableIterator<Value> {
    return this.#snapshot.values();
  }
}
