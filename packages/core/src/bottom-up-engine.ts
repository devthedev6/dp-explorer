import type { ProblemSpec } from "./problem-spec";
import type { ExecutionResult } from "./execution-result";
import { freezeDpTable } from "./execution-result";
import type { StateCoordinates } from "./state-key";
import { toStateKey } from "./state-key";
import type { ExecutionTrace } from "./trace";
import { EventType } from "./trace";
import type { TraceEvent, TraceEventId } from "./trace";

/**
 * Execute a `ProblemSpec` using bottom-up tabulation and produce an immutable
 * execution trace.
 *
 * The engine is generic: it follows the spec's iteration order, instruments
 * every transition read, and emits the existing trace format consumed by
 * playback.
 */
export function runBottomUp<Input>(spec: ProblemSpec<Input>, input: Input): ExecutionResult<Input> {
  const events: TraceEvent[] = [];
  const table = new Map<ReturnType<typeof toStateKey>, number>();
  let answerReadCount = 0;
  const inputSnapshot = deepFreeze(cloneInput(input));

  const nextId = (): TraceEventId => events.length;

  const emit = <TEvent extends TraceEvent>(event: TEvent): TEvent => {
    const frozenEvent = Object.freeze(event) as TEvent;
    events.push(frozenEvent);
    return frozenEvent;
  };

  const readWrittenState = (
    state: StateCoordinates
  ): { stateKey: ReturnType<typeof toStateKey>; value: number } => {
    const stateKey = toStateKey(state);
    const value = table.get(stateKey);

    if (value === undefined) {
      throw new Error(
        `Bottom-up iteration order read unwritten state ${stateKey}. ` +
          "ProblemSpec.iterationOrder must yield dependencies before dependents."
      );
    }

    return { stateKey, value };
  };

  for (const state of spec.iterationOrder(input)) {
    const stateKey = toStateKey(state);
    const baseCase = spec.baseCase(state, input);

    if (baseCase.isBase) {
      emit({
        id: nextId(),
        type: EventType.BaseCase,
        state: stateKey,
        value: baseCase.value,
        parentId: null
      });

      table.set(stateKey, baseCase.value);
      emit({
        id: nextId(),
        type: EventType.Write,
        state: stateKey,
        value: baseCase.value
      });

      continue;
    }

    const usedReads: TraceEventId[] = [];
    const value = spec.transition(state, {
      input,
      read: (dependencyState) => {
        const dependency = readWrittenState(dependencyState);
        const read = emit({
          id: nextId(),
          type: EventType.Read,
          state: dependency.stateKey,
          value: dependency.value,
          requestedFor: stateKey
        });

        usedReads.push(read.id);
        return dependency.value;
      }
    });

    emit({
      id: nextId(),
      type: EventType.Transition,
      state: stateKey,
      usedReads: Object.freeze([...usedReads]),
      value
    });

    table.set(stateKey, value);
    emit({
      id: nextId(),
      type: EventType.Write,
      state: stateKey,
      value
    });
  }

  const answer = spec.extractAnswer(input, (state) => {
    if (answerReadCount > 0) {
      throw new Error("ProblemSpec.extractAnswer must call read exactly once.");
    }

    answerReadCount += 1;
    const result = readWrittenState(state);
    emit({
      id: nextId(),
      type: EventType.Read,
      state: result.stateKey,
      value: result.value,
      requestedFor: "ANSWER"
    });

    return result.value;
  });

  if (answerReadCount !== 1) {
    throw new Error("ProblemSpec.extractAnswer must call read exactly once.");
  }

  emit({
    id: nextId(),
    type: EventType.Complete,
    answer
  });

  const trace = freezeTrace({
    problemId: spec.id,
    mode: "bottom-up",
    input: inputSnapshot,
    stateVariables: Object.freeze([...spec.stateVariables]),
    dimensions: Object.freeze([...spec.dimensions(input)]),
    events: Object.freeze([...events])
  });

  return Object.freeze({
    trace,
    dpTable: freezeDpTable(table)
  });
}

function freezeTrace<Input>(trace: ExecutionTrace<Input>): ExecutionTrace<Input> {
  return Object.freeze(trace);
}

function cloneInput<Input>(input: Input): Input {
  if (!isObject(input)) {
    return input;
  }

  return structuredClone(input);
}

function deepFreeze<Value>(value: Value): Value {
  if (!isObject(value) || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value)) {
    deepFreeze(child);
  }

  return Object.freeze(value);
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}
