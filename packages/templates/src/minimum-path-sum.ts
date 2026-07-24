import type { FunctionalProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface MinimumPathSumInput {
  readonly rows: number;
  readonly columns: number;
  readonly grid: readonly (readonly number[])[];
}

/**
 * Minimum Path Sum functional specification.
 *
 * State (i, j) represents the minimum cost to reach cell (i, j) from the top-left
 * corner. The start cell contributes its own cost. The first row and first
 * column each have only one possible path. All other cells choose the cheaper
 * of the cell above or to the left and add the current cell's cost.
 */
export const minimumPathSumSpec: FunctionalProblemSpec<MinimumPathSumInput> = {
  id: "minimum-path-sum",
  name: "Minimum Path Sum",
  title: "Minimum Path Sum",
  description:
    "Given an m × n grid of non-negative integers, find the minimum cost path from the top-left corner to the bottom-right corner. You may only move right or down.",
  formulation: {
    title: "Minimum Path Sum",
    problemStatement:
      "Given an m × n grid of non-negative integers, find the minimum cost path from the top-left corner to the bottom-right corner. You may only move right or down.",
    stateDefinition: "dp[i][j] represents the minimum cost required to reach cell (i, j).",
    baseCases:
      "The starting cell contains its own cost. The first row and first column each have only one possible path.",
    transition:
      "Move from either dp[i-1][j] or dp[i][j-1]. Choose the smaller value and add the current cell's cost.",
    timeComplexity: "O(rows × columns)",
    spaceComplexity: "O(rows × columns)"
  },
  stateVariables: ["i", "j"],
  inputSchema: [
    { name: "rows", label: "Rows", type: "integer", min: 1, max: 15 },
    { name: "columns", label: "Columns", type: "integer", min: 1, max: 15 },
    {
      name: "grid",
      label: "Grid Values",
      type: "string",
      maxLength: 4096,
      description: "Editable rows × columns grid of non-negative integers."
    }
  ],
  dimensions: (input) => [input.rows, input.columns],
  rootState: (input) => [input.rows - 1, input.columns - 1],
  baseCase: (state, input) => {
    const [i, j] = readIndices(state);

    if (i === 0 && j === 0) {
      return { isBase: true, value: input.grid[0]?.[0] ?? 0 };
    }

    return { isBase: false };
  },
  transition: (state, ctx) => {
    const input = ctx.input;
    const [i, j] = readIndices(state);
    const cellCost = input.grid[i]?.[j];

    if (cellCost === undefined) {
      throw new Error("Minimum Path Sum transition references an out-of-bounds cell.");
    }
    if (i == 0) {
      return ctx.read([0, j - 1]) + cellCost;
    }
    if (j == 0) {
      return ctx.read([i - 1, 0]) + cellCost;
    }
    const fromAbove = ctx.read([i - 1, j]);
    const fromLeft = ctx.read([i, j - 1]);

    return Math.min(fromAbove, fromLeft) + cellCost;
  },
  iterationOrder: function* (input) {
    for (let i = 0; i < input.rows; i += 1) {
      for (let j = 0; j < input.columns; j += 1) {
        yield [i, j];
      }
    }
  },
  extractAnswer: (ctx) => ctx.read([ctx.input.rows - 1, ctx.input.columns - 1])
};

function readIndices(state: StateCoordinates): [number, number] {
  const i = state[0];
  const j = state[1];

  if (i === undefined || j === undefined) {
    throw new Error("Minimum Path Sum expects two-dimensional state.");
  }

  return [i, j];
}
