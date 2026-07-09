import type { ProblemSpec } from "./problem-spec";
import type { ExecutionResult } from "./execution-result";
import { freezeDpTable } from "./execution-result";
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
  let answerReadCount = 0;
  const inputSnapshot = deepFreeze(cloneInput(input));

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

  const answer = spec.extractAnswer(input, (state) => {
    if (answerReadCount > 0) {
      throw new Error("ProblemSpec.extractAnswer must call read exactly once.");
    }

    answerReadCount += 1;
    const result = evaluate(state, null, 0);
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
    mode: "top-down",
    input: inputSnapshot,
    stateVariables: Object.freeze([...spec.stateVariables]),
    dimensions: Object.freeze([...spec.dimensions(input)]),
    events: Object.freeze([...events])
  });

  return Object.freeze({
    trace,
    dpTable: freezeDpTable(memo)
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
