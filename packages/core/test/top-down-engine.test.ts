import { describe, expect, it } from "vitest";

import type { ProblemSpec, StateCoordinates, TraceEvent } from "../src";
import { EventType, runTopDown } from "../src";

interface FibonacciInput {
  readonly n: number;
}

const fibonacciSpec: ProblemSpec<FibonacciInput> = {
  id: "fibonacci",
  name: "Fibonacci",
  stateVariables: ["i"],
  inputSchema: [{ name: "n", label: "n", type: "integer", min: 0, max: 20 }],
  dimensions: (input) => [input.n + 1],
  rootState: (input) => [input.n],
  baseCase: (state) => {
    const i = readSingleCoordinate(state);
    return i <= 1 ? { isBase: true, value: i } : { isBase: false };
  },
  transition: (state, ctx) => {
    const i = readSingleCoordinate(state);
    return ctx.read([i - 1]) + ctx.read([i - 2]);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.n; i += 1) {
      yield [i];
    }
  },
  extractAnswer: (ctx) => ctx.read([ctx.input.n])
};

describe("runTopDown", () => {
  it("generates the deterministic top-down Fibonacci trace in documented event order", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });

    expect(trace).toStrictEqual({
      problemId: "fibonacci",
      mode: "top-down",
      input: { n: 3 },
      stateVariables: ["i"],
      dimensions: [4],
      events: [
        { id: 0, type: EventType.Call, state: "3", depth: 0, parentId: null },
        { id: 1, type: EventType.Call, state: "2", depth: 1, parentId: 0 },
        { id: 2, type: EventType.Call, state: "1", depth: 2, parentId: 1 },
        { id: 3, type: EventType.BaseCase, state: "1", value: 1, parentId: 1 },
        { id: 4, type: EventType.Call, state: "0", depth: 2, parentId: 1 },
        { id: 5, type: EventType.BaseCase, state: "0", value: 0, parentId: 1 },
        { id: 6, type: EventType.Read, state: "1", value: 1, requestedFor: "2" },
        { id: 7, type: EventType.Read, state: "0", value: 0, requestedFor: "2" },
        { id: 8, type: EventType.Transition, state: "2", usedReads: [6, 7], value: 1 },
        { id: 9, type: EventType.Write, state: "2", value: 1 },
        { id: 10, type: EventType.Return, state: "2", value: 1, parentId: 0 },
        { id: 11, type: EventType.Call, state: "1", depth: 1, parentId: 0 },
        { id: 12, type: EventType.MemoHit, state: "1", value: 1, parentId: 0 },
        { id: 13, type: EventType.Read, state: "2", value: 1, requestedFor: "3" },
        { id: 14, type: EventType.Read, state: "1", value: 1, requestedFor: "3" },
        { id: 15, type: EventType.Transition, state: "3", usedReads: [13, 14], value: 2 },
        { id: 16, type: EventType.Write, state: "3", value: 2 },
        { id: 17, type: EventType.Return, state: "3", value: 2, parentId: null },
        { id: 18, type: EventType.Complete, answer: 2 }
      ]
    });
  });

  it("begins top-down execution from the explicit root state", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 4 });

    expect(trace.events[0]).toMatchObject({
      type: EventType.Call,
      state: "4",
      depth: 0,
      parentId: null
    });
  });

  it("records recursive call order and depth independently of visualization concerns", () => {
    const calls = runTopDown(fibonacciSpec, { n: 3 }).trace.events.filter(
      (event) => event.type === EventType.Call
    );

    expect(calls).toEqual([
      { id: 0, type: EventType.Call, state: "3", depth: 0, parentId: null },
      { id: 1, type: EventType.Call, state: "2", depth: 1, parentId: 0 },
      { id: 2, type: EventType.Call, state: "1", depth: 2, parentId: 1 },
      { id: 4, type: EventType.Call, state: "0", depth: 2, parentId: 1 },
      { id: 11, type: EventType.Call, state: "1", depth: 1, parentId: 0 }
    ]);
  });

  it("emits memo hits for repeated states without recomputing their transition", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });
    const memoHits = trace.events.filter((event) => event.type === EventType.MemoHit);
    const transitions = trace.events.filter((event) => event.type === EventType.Transition);

    expect(memoHits).toEqual([
      { id: 12, type: EventType.MemoHit, state: "1", value: 1, parentId: 0 }
    ]);
    expect(transitions.map((event) => event.state)).toEqual(["2", "3"]);
  });

  it("keeps transition provenance tied to prior READ event ids", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });
    const transitions = trace.events.filter((event) => event.type === EventType.Transition);

    for (const transition of transitions) {
      for (const readId of transition.usedReads) {
        const read = trace.events[readId];
        expect(read).toBeDefined();
        expect(read?.type).toBe(EventType.Read);
        expect(readId).toBeLessThan(transition.id);
      }
    }
  });

  it("gives every CALL exactly one terminal event", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });
    const terminalTypes = new Set<string>([
      EventType.MemoHit,
      EventType.BaseCase,
      EventType.Return
    ]);

    for (const call of trace.events.filter((event) => event.type === EventType.Call)) {
      const terminals = trace.events.filter(
        (event) =>
          terminalTypes.has(event.type) &&
          "state" in event &&
          event.state === call.state &&
          "parentId" in event &&
          event.parentId === call.parentId &&
          event.id > call.id
      );

      expect(terminals).toHaveLength(1);
    }
  });

  it("produces identical traces for repeated executions", () => {
    const first = runTopDown(fibonacciSpec, { n: 4 }).trace;
    const second = runTopDown(fibonacciSpec, { n: 4 }).trace;

    expect(second).toStrictEqual(first);
  });

  it("freezes generated trace containers and event objects", () => {
    const { trace } = runTopDown(fibonacciSpec, { n: 3 });
    const firstEvent = trace.events[0];
    const transition = trace.events.find((event) => event.type === EventType.Transition);

    expect(firstEvent).toBeDefined();
    expect(transition).toBeDefined();
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.events)).toBe(true);
    expect(Object.isFrozen(trace.input)).toBe(true);
    expect(Object.isFrozen(trace.stateVariables)).toBe(true);
    expect(Object.isFrozen(trace.dimensions)).toBe(true);
    expect(firstEvent ? Object.isFrozen(firstEvent) : false).toBe(true);
    expect(
      transition && transition.type === EventType.Transition
        ? Object.isFrozen(transition.usedReads)
        : false
    ).toBe(true);
    expect(() => {
      (trace.events as TraceEvent[]).push(firstEvent as TraceEvent);
    }).toThrow(TypeError);
  });

  it("snapshots input so later caller mutation does not change the trace", () => {
    const input = { n: 3 };
    const { trace } = runTopDown(fibonacciSpec, input);

    input.n = 4;

    expect(trace.input).toEqual({ n: 3 });
  });

  it("returns a frozen execution result with the completed memo table", () => {
    const result = runTopDown(fibonacciSpec, { n: 3 });

    expect(Object.keys(result)).toEqual(["trace", "dpTable"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dpTable)).toBe(true);
    expect(result.dpTable.size).toBe(4);
    expect([...result.dpTable.entries()]).toEqual([
      ["1", 1],
      ["0", 0],
      ["2", 1],
      ["3", 2]
    ]);
    expect(result.dpTable.get("3")).toBe(2);
    expect(result.dpTable.has("2")).toBe(true);
    expect("set" in result.dpTable).toBe(false);
  });

  it("initializes unvisited states in the returned table when provided", () => {
    let initialCalls = 0;
    const spec: ProblemSpec<FibonacciInput> = {
      ...fibonacciSpec,
      initialValue: () => {
        initialCalls += 1;
        return -1;
      }
    };

    const result = runTopDown(spec, { n: 1 });

    expect(initialCalls).toBe(1);
    expect(result.dpTable.get("0")).toBe(-1);
    expect(result.dpTable.get("1")).toBe(1);
  });
});

function readSingleCoordinate(state: StateCoordinates): number {
  const i = state[0];
  if (i === undefined) {
    throw new Error("Fibonacci fixture expects a one-dimensional state.");
  }

  return i;
}
