import type { ProblemSpec } from "./problem-spec";
import type { ExecutionResult } from "./execution-result";
import { freezeDpTable } from "./execution-result";
import { createExtractionContextFromTable } from "./extraction-context";
import type { StateCoordinates } from "./state-key";
import { toStateKey } from "./state-key";
import type { ExecutionTrace } from "./trace";
import { EventType } from "./trace";
import type { TraceEvent, TraceEventId } from "./trace";

interface EvaluationResult {
  readonly stateKey: ReturnType<typeof toStateKey>;
  readonly value: number;
}

/**
 * Execute a `ProblemSpec` using memoized recursion and produce an immutable
 * execution trace.
 *
 * The engine is generic: it knows how to walk states, memoize values, and emit
 * events, but it has no knowledge of any particular DP problem or UI concern.
 */
export function runTopDown<Input>(spec: ProblemSpec<Input>, input: Input): ExecutionResult<Input> {
  const events: TraceEvent[] = [];
  const memo = new Map<ReturnType<typeof toStateKey>, number>();
  const inputSnapshot = deepFreeze(cloneInput(input));
  const initialValue = spec.initialValue?.(input);

  const nextId = (): TraceEventId => events.length;

  const emit = <TEvent extends TraceEvent>(event: TEvent): TEvent => {
    const frozenEvent = Object.freeze(event) as TEvent;
    events.push(frozenEvent);
    return frozenEvent;
  };

  const evaluate = (
    state: StateCoordinates,
    parentId: TraceEventId | null,
    depth: number
  ): EvaluationResult => {
    const stateKey = toStateKey(state);
    const call = emit({
      id: nextId(),
      type: EventType.Call,
      state: stateKey,
      depth,
      parentId
    });

    const memoized = memo.get(stateKey);
    if (memoized !== undefined) {
      if (parentId === null) {
        throw new Error("Root memo hit is invalid for a top-down ProblemSpec answer read.");
      }

      emit({
        id: nextId(),
        type: EventType.MemoHit,
        state: stateKey,
        value: memoized,
        parentId
      });

      return { stateKey, value: memoized };
    }

    const baseCase = spec.baseCase(state, input);
    if (baseCase.isBase) {
      memo.set(stateKey, baseCase.value);
      emit({
        id: nextId(),
        type: EventType.BaseCase,
        state: stateKey,
        value: baseCase.value,
        parentId
      });

      return { stateKey, value: baseCase.value };
    }

    const pendingReads: EvaluationResult[] = [];
    const value = spec.transition(state, {
      input,
      read: (dependencyState) => {
        const dependency = evaluate(dependencyState, call.id, depth + 1);
        pendingReads.push(dependency);
        return dependency.value;
      }
    });

    const usedReads = pendingReads.map((dependency) => {
      const read = emit({
        id: nextId(),
        type: EventType.Read,
        state: dependency.stateKey,
        value: dependency.value,
        requestedFor: stateKey
      });

      return read.id;
    });

    emit({
      id: nextId(),
      type: EventType.Transition,
      state: stateKey,
      usedReads: Object.freeze([...usedReads]),
      value
    });

    memo.set(stateKey, value);
    emit({
      id: nextId(),
      type: EventType.Write,
      state: stateKey,
      value
    });

    emit({
      id: nextId(),
      type: EventType.Return,
      state: stateKey,
      value,
      parentId
    });

    return { stateKey, value };
  };

  evaluate(spec.rootState(input), null, 0);

  const dimensions = Object.freeze([...spec.dimensions(input)]);
  const dpTable =
    initialValue === undefined
      ? freezeDpTable(memo)
      : freezeDpTable(createInitializedTable(spec, input, initialValue, memo));
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
    mode: "top-down",
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

function createInitializedTable<Input>(
  spec: ProblemSpec<Input>,
  input: Input,
  initialValue: number,
  memo: ReadonlyMap<ReturnType<typeof toStateKey>, number>
): Map<ReturnType<typeof toStateKey>, number> {
  const table = new Map<ReturnType<typeof toStateKey>, number>();
  for (const state of spec.iterationOrder(input)) {
    table.set(toStateKey(state), initialValue);
  }
  for (const [stateKey, value] of memo) {
    table.set(stateKey, value);
  }
  return table;
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
