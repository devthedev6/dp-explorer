import type { FunctionalProblemSpec } from "./problem-spec";
import type { ExecutionResult } from "./execution-result";
import { freezeDpTable } from "./execution-result";
import { createExtractionContextFromTable } from "./extraction-context";
import type { StateCoordinates } from "./state-key";
import { toStateKey } from "./state-key";
import type { ExecutionTrace } from "./trace";
import { EventType } from "./trace";
import type { TraceEvent, TraceEventId } from "./trace";

/**
 * Execute a `FunctionalProblemSpec` using bottom-up tabulation and produce an immutable
 * execution trace.
 *
 * The engine is generic: it follows the spec's iteration order, instruments
 * every transition read, and emits the existing trace format consumed by
 * playback.
 */
export function runBottomUp<Input>(
  spec: FunctionalProblemSpec<Input>,
  input: Input
): ExecutionResult<Input> {
  const events: TraceEvent[] = [];
  const table = new Map<ReturnType<typeof toStateKey>, number>();
  const inputSnapshot = deepFreeze(cloneInput(input));
  const iterationStates = [...spec.iterationOrder(input)];

  if (spec.initialValue !== undefined) {
    const initialValue = spec.initialValue(input);
    for (const state of iterationStates) {
      table.set(toStateKey(state), initialValue);
    }
  }

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
          "FunctionalProblemSpec.iterationOrder must yield dependencies before dependents."
      );
    }

    return { stateKey, value };
  };

  for (const state of iterationStates) {
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

  const dimensions = Object.freeze([...spec.dimensions(input)]);
  const dpTable = freezeDpTable(table);
  const extractionContext = createExtractionContextFromTable({
    dpTable,
    input: inputSnapshot,
    dimensions
  });
  const answer = spec.extractAnswer(extractionContext);

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
    dimensions,
    events: Object.freeze([...events])
  });

  return Object.freeze({
    trace,
    dpTable
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
