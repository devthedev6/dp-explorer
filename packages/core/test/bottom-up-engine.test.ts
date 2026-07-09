import { describe, expect, it } from "vitest";

import type { ProblemSpec, StateCoordinates, TraceEvent } from "../src";
import { EventType, runBottomUp } from "../src";

interface FibonacciInput {
  readonly n: number;
}

const fibonacciSpec: ProblemSpec<FibonacciInput> = {
  id: "fibonacci",
  name: "Fibonacci",
  stateVariables: ["i"],
  inputSchema: [{ name: "n", label: "n", type: "integer", min: 0, max: 20 }],
  dimensions: (input) => [input.n + 1],
  baseCase: (state) => {
    const i = readSingleCoordinate(state);
    return i <= 1 ? { isBase: true, value: i } : { isBase: false };
  },
  transition: (state, ctx) => {
    const i = readSingleCoordinate(state);
    return ctx.read([i - 2]) + ctx.read([i - 1]);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.n; i += 1) {
      yield [i];
    }
  },
  extractAnswer: (input, read) => read([input.n])
};

describe("runBottomUp", () => {
  it("generates the deterministic bottom-up Fibonacci trace in documented event order", () => {
    const { trace } = runBottomUp(fibonacciSpec, { n: 3 });

    expect(trace).toStrictEqual({
      problemId: "fibonacci",
      mode: "bottom-up",
      input: { n: 3 },
      stateVariables: ["i"],
      dimensions: [4],
      events: [
        { id: 0, type: EventType.BaseCase, state: "0", value: 0, parentId: null },
        { id: 1, type: EventType.Write, state: "0", value: 0 },
        { id: 2, type: EventType.BaseCase, state: "1", value: 1, parentId: null },
        { id: 3, type: EventType.Write, state: "1", value: 1 },
        { id: 4, type: EventType.Read, state: "0", value: 0, requestedFor: "2" },
        { id: 5, type: EventType.Read, state: "1", value: 1, requestedFor: "2" },
        { id: 6, type: EventType.Transition, state: "2", usedReads: [4, 5], value: 1 },
        { id: 7, type: EventType.Write, state: "2", value: 1 },
        { id: 8, type: EventType.Read, state: "1", value: 1, requestedFor: "3" },
        { id: 9, type: EventType.Read, state: "2", value: 1, requestedFor: "3" },
        { id: 10, type: EventType.Transition, state: "3", usedReads: [8, 9], value: 2 },
        { id: 11, type: EventType.Write, state: "3", value: 2 },
        { id: 12, type: EventType.Read, state: "3", value: 2, requestedFor: "ANSWER" },
        { id: 13, type: EventType.Complete, answer: 2 }
      ]
    });
  });

  it("throws when iteration order reads an unwritten dependency", () => {
    const invalidSpec: ProblemSpec<FibonacciInput> = {
      ...fibonacciSpec,
      iterationOrder: function* (input) {
        for (let i = input.n; i >= 0; i -= 1) {
          yield [i];
        }
      }
    };

    expect(() => runBottomUp(invalidSpec, { n: 3 })).toThrow(
      "Bottom-up iteration order read unwritten state"
    );
  });

  it("emits no top-down-only events or call tree fields", () => {
    const { trace } = runBottomUp(fibonacciSpec, { n: 3 });
    const eventTypes = trace.events.map((event) => event.type);

    expect(eventTypes).not.toContain(EventType.Call);
    expect(eventTypes).not.toContain(EventType.MemoHit);
    expect(eventTypes).not.toContain(EventType.Return);
  });

  it("freezes generated trace containers and transition read ids", () => {
    const { trace } = runBottomUp(fibonacciSpec, { n: 3 });
    const transition = trace.events.find((event) => event.type === EventType.Transition);

    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.events)).toBe(true);
    expect(Object.isFrozen(trace.input)).toBe(true);
    expect(Object.isFrozen(trace.stateVariables)).toBe(true);
    expect(Object.isFrozen(trace.dimensions)).toBe(true);
    expect(Object.isFrozen(trace.events[0])).toBe(true);
    expect(
      transition && transition.type === EventType.Transition
        ? Object.isFrozen(transition.usedReads)
        : false
    ).toBe(true);
    expect(() => {
      (trace.events as TraceEvent[]).push(trace.events[0] as TraceEvent);
    }).toThrow(TypeError);
  });

  it("returns a frozen execution result with the completed tabulation table", () => {
    const result = runBottomUp(fibonacciSpec, { n: 3 });

    expect(Object.keys(result)).toEqual(["trace", "dpTable"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.dpTable)).toBe(true);
    expect(result.dpTable.size).toBe(4);
    expect([...result.dpTable.entries()]).toEqual([
      ["0", 0],
      ["1", 1],
      ["2", 1],
      ["3", 2]
    ]);
    expect(result.dpTable.get("3")).toBe(2);
    expect(result.dpTable.has("2")).toBe(true);
    expect("set" in result.dpTable).toBe(false);
  });
});

function readSingleCoordinate(state: StateCoordinates): number {
  const i = state[0];
  if (i === undefined) {
    throw new Error("Fibonacci fixture expects a one-dimensional state.");
  }

  return i;
}
