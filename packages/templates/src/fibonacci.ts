import type { FunctionalProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface FibonacciInput {
  readonly n: number;
}

/**
 * Minimal Fibonacci functional specification used to verify the pipeline composition.
 *
 * The recurrence lives in the template package as declarative math. Execution
 * order, recursion, memoization, and trace emission remain owned by core.
 */
export const fibonacciSpec: FunctionalProblemSpec<FibonacciInput> = {
  id: "fibonacci",
  name: "Fibonacci",
  title: "Fibonacci Numbers",
  description:
    "Given an integer n, compute the nth Fibonacci number where F(0)=0, F(1)=1, and F(n)=F(n−1)+F(n−2).",
  formulation: {
    title: "Fibonacci Numbers",
    problemStatement: "Given an integer n, compute the nth Fibonacci number.",
    stateDefinition: "dp[n] = nth Fibonacci number.",
    baseCases: "dp[0]=0\ndp[1]=1",
    transition: "dp[n]=dp[n−1]+dp[n−2]",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)"
  },
  stateVariables: ["i"],
  inputSchema: [{ name: "n", label: "n", type: "integer", min: 0, max: 20 }],
  dimensions: (input) => [input.n + 1],
  rootState: (input) => [input.n],
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
  extractAnswer: (ctx) => ctx.read([ctx.input.n])
};

function readIndex(state: StateCoordinates): number {
  const i = state[0];
  if (i === undefined) {
    throw new Error("Fibonacci expects one-dimensional state.");
  }

  return i;
}
