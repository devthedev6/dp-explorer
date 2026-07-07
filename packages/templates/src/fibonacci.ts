import type { ProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface FibonacciInput {
  readonly n: number;
}

/**
 * Minimal Fibonacci ProblemSpec used to verify the pipeline composition.
 *
 * The recurrence lives in the template package as declarative math. Execution
 * order, recursion, memoization, and trace emission remain owned by core.
 */
export const fibonacciSpec: ProblemSpec<FibonacciInput> = {
  id: "fibonacci",
  name: "Fibonacci",
  stateVariables: ["i"],
  inputSchema: [{ name: "n", label: "n", type: "integer", min: 0, max: 20 }],
  dimensions: (input) => [input.n + 1],
  baseCase: (state) => {
    const i = readIndex(state);
    return i <= 1 ? { isBase: true, value: i } : { isBase: false };
  },
  transition: (state, ctx) => {
    const i = readIndex(state);
    return ctx.read([i - 1]) + ctx.read([i - 2]);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.n; i += 1) {
      yield [i];
    }
  },
  extractAnswer: (input, read) => read([input.n])
};

function readIndex(state: StateCoordinates): number {
  const i = state[0];
  if (i === undefined) {
    throw new Error("Fibonacci expects one-dimensional state.");
  }

  return i;
}
