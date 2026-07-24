import { describe, expect, it } from "vitest";

import type { FunctionalProblemSpec, StateCoordinates } from "../src";
import { createExtractionContext, runBottomUp, runTopDown } from "../src";

interface FibonacciInput {
  readonly n: number;
}

const fibonacciSpec: FunctionalProblemSpec<FibonacciInput> = {
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

describe("createExtractionContext", () => {
  it("creates an immutable read-only view over a completed top-down result", () => {
    const result = runTopDown(fibonacciSpec, { n: 3 });
    const context = createExtractionContext(result);

    expect(Object.isFrozen(context)).toBe(true);
    expect(context.input).toBe(result.trace.input);
    expect(context.dimensions).toBe(result.trace.dimensions);
    expect(context.read([3])).toBe(2);
    expect(context.has([2])).toBe(true);
    expect(context.has([4])).toBe(false);
    expect([...context.states()]).toEqual([...result.dpTable.keys()]);
    expect("write" in context).toBe(false);
  });

  it("creates an immutable read-only view over a completed bottom-up result", () => {
    const result = runBottomUp(fibonacciSpec, { n: 3 });
    const context = createExtractionContext(result);

    expect(Object.isFrozen(context)).toBe(true);
    expect(context.read([0])).toBe(0);
    expect(context.read([3])).toBe(2);
    expect([...context.states()]).toEqual(["0", "1", "2", "3"]);
  });

  it("observes only the frozen table and does not append trace events", () => {
    const result = runBottomUp(fibonacciSpec, { n: 3 });
    const context = createExtractionContext(result);
    const traceEventsBeforeRead = result.trace.events;

    context.read([3]);
    context.has([2]);
    Array.from(context.states());

    expect(result.trace.events).toBe(traceEventsBeforeRead);
    expect(result.trace.events).toHaveLength(13);
  });

  it("throws for missing states without computing them", () => {
    const result = runTopDown(fibonacciSpec, { n: 3 });
    const context = createExtractionContext(result);
    const traceEventsBeforeRead = result.trace.events;

    expect(() => context.read([4])).toThrow(
      "Cannot read missing DP state 4 from ExtractionContext."
    );
    expect(result.trace.events).toBe(traceEventsBeforeRead);
  });
});

function readSingleCoordinate(state: StateCoordinates): number {
  const i = state[0];
  if (i === undefined) {
    throw new Error("Fibonacci fixture expects a one-dimensional state.");
  }

  return i;
}
