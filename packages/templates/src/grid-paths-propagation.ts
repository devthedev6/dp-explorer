import type { PropagationProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface GridPathsPropagationInput {
  readonly rows: number;
  readonly columns: number;
}

/**
 * 2D Grid Paths propagation specification.
 *
 * State dp[i][j] stores the number of ways to reach cell (i, j). The start
 * state is seeded with one way, and each processed cell sends its current value
 * to the cell below and the cell to the right when those cells are inside the
 * grid.
 */
export const gridPathsPropagationSpec: PropagationProblemSpec<GridPathsPropagationInput> = {
  id: "grid-paths-propagation",
  name: "2D Grid Paths",
  title: "2D Grid Paths",
  description:
    "Given a rows x columns grid, count paths from the top-left cell to the bottom-right cell when movement is allowed only right or down.",
  formulation: {
    title: "2D Grid Paths",
    problemStatement:
      "Given a rows x columns grid, count the number of ways to reach each cell from the starting cell. You may only move right or down.",
    stateDefinition: "dp[i][j] represents the number of ways to reach cell (i, j).",
    baseCases: "The starting cell is seeded before propagation begins: dp[0][0] = 1.",
    transition:
      "When processing dp[i][j], send dp[i][j] to dp[i+1][j] and dp[i][j+1] if the target cell is inside the grid.",
    timeComplexity: "O(rows x columns)",
    spaceComplexity: "O(rows x columns)"
  },
  stateVariables: ["i", "j"],
  inputSchema: [
    { name: "rows", label: "Rows", type: "integer", min: 1, max: 15 },
    { name: "columns", label: "Columns", type: "integer", min: 1, max: 15 }
  ],
  dimensions: (input) => [input.rows, input.columns],
  initialStates: () => [{ state: [0, 0], value: 1 }],
  transitions: (state, context) => {
    const [i, j] = readIndices(state);
    const transitions = [];

    if (i + 1 < context.input.rows) {
      transitions.push({ target: [i + 1, j], contribution: context.value });
    }

    if (j + 1 < context.input.columns) {
      transitions.push({ target: [i, j + 1], contribution: context.value });
    }

    return transitions;
  },
  aggregate: (currentValue, contribution) => currentValue + contribution,
  schedule: function* (input) {
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
    throw new Error("2D Grid Paths expects two-dimensional state.");
  }

  return [i, j];
}
