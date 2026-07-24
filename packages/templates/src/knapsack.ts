import type { FunctionalProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface KnapsackInput {
  readonly capacity: number;
  readonly weights: readonly number[];
  readonly values: readonly number[];
}

/**
 * 0/1 Knapsack functional specification.
 *
 * State (i, w) represents the maximum value obtainable using the first i items
 * with a knapsack capacity of w. Base cases occur when no items are available
 * or no capacity remains. The recurrence either skips the current item or
 * includes it if it fits.
 */
export const knapsackSpec: FunctionalProblemSpec<KnapsackInput> = {
  id: "knapsack",
  name: "0/1 Knapsack",
  title: "0/1 Knapsack",
  description:
    "Given weights and values of items and a knapsack with fixed capacity, compute the maximum total value that can be obtained without exceeding the capacity.",
  formulation: {
    title: "0/1 Knapsack",
    problemStatement:
      "Given weights and values of items and a knapsack with fixed capacity, compute the maximum total value that can be obtained without exceeding the capacity. Each item may be chosen at most once.",
    stateDefinition:
      "dp[i][w] = maximum value obtainable using the first i items (0 ≤ i ≤ n) with knapsack capacity w (0 ≤ w ≤ W).",
    baseCases: "If i = 0 or w = 0, the answer is 0.",
    transition:
      "If weights[i-1] > w:\n  dp[i][w] = dp[i-1][w]\nOtherwise:\n  dp[i][w] = max(\n    dp[i-1][w],\n    values[i-1] + dp[i-1][w - weights[i-1]]\n  )",
    timeComplexity: "O(n × W)",
    spaceComplexity: "O(n × W)"
  },
  stateVariables: ["i", "w"],
  inputSchema: [
    { name: "capacity", label: "Capacity", type: "integer", min: 0, max: 30 },
    {
      name: "weights",
      label: "Weights (comma-separated)",
      type: "string",
      maxLength: 64,
      description: "Comma-separated list of item weights."
    },
    {
      name: "values",
      label: "Values (comma-separated)",
      type: "string",
      maxLength: 64,
      description: "Comma-separated list of item values."
    }
  ],
  dimensions: (input) => [input.weights.length + 1, input.capacity + 1],
  rootState: (input) => [input.weights.length, input.capacity],
  baseCase: (state) => {
    const [i, w] = readIndices(state);

    if (i === 0 || w === 0) {
      return { isBase: true, value: 0 };
    }

    return { isBase: false };
  },
  transition: (state, ctx) => {
    const input = ctx.input;
    const [i, w] = readIndices(state);
    const itemWeight = input.weights[i - 1];

    if (itemWeight === undefined) {
      throw new Error("Knapsack transition references an out-of-bounds item.");
    }

    const withoutItem = ctx.read([i - 1, w]);

    if (itemWeight > w) {
      return withoutItem;
    }

    const itemValue = input.values[i - 1];

    if (itemValue === undefined) {
      throw new Error("Knapsack transition references an out-of-bounds item value.");
    }

    const withItem = itemValue + ctx.read([i - 1, w - itemWeight]);

    return Math.max(withoutItem, withItem);
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.weights.length; i += 1) {
      for (let w = 0; w <= input.capacity; w += 1) {
        yield [i, w];
      }
    }
  },
  extractAnswer: (ctx) => ctx.read([ctx.input.weights.length, ctx.input.capacity])
};

function readIndices(state: StateCoordinates): [number, number] {
  const i = state[0];
  const w = state[1];

  if (i === undefined || w === undefined) {
    throw new Error("Knapsack expects two-dimensional state.");
  }

  return [i, w];
}
