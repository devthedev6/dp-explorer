import type { ProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface UniquePathsIIInput {
  readonly rows: number;
  readonly columns: number;
  readonly blocked: ReadonlySet<string>;
}

/**
 * Unique Paths II ProblemSpec.
 *
 * State (i, j) represents the number of ways to reach cell (i, j) from the
 * top-left corner. A blocked cell has zero ways. The start cell has one way
 * if it is not blocked. All other cells sum the ways from above and to the
 * left.
 */
export const uniquePathsIISpec: ProblemSpec<UniquePathsIIInput> = {
  id: "unique-paths-ii",
  name: "Unique Paths II",
  title: "Unique Paths II",
  description:
    "Given an m × n grid with blocked cells, count the number of different paths from the top-left corner to the bottom-right corner. You may only move right or down.",
  formulation: {
    title: "Unique Paths II",
    problemStatement:
      "Given an m × n grid with blocked cells, count the number of different paths from the top-left corner to the bottom-right corner. You may only move right or down.",
    stateDefinition: "dp[i][j] represents the number of ways to reach cell (i, j).",
    baseCases: "The starting cell has one way if it is not blocked. Blocked cells have zero ways.",
    transition:
      "If the current cell is not blocked, add the number of ways from the cell above and the cell to the left.",
    timeComplexity: "O(rows × columns)",
    spaceComplexity: "O(rows × columns)"
  },
  stateVariables: ["i", "j"],
  inputSchema: [
    { name: "rows", label: "Rows", type: "integer", min: 1, max: 10 },
    { name: "columns", label: "Columns", type: "integer", min: 1, max: 10 },
    {
      name: "blocked",
      label: "Blocked Cells",
      type: "string",
      maxLength: 256,
      description: "One coordinate per line in row,column format."
    }
  ],
  dimensions: (input) => [input.rows, input.columns],
  baseCase: (state, input) => {
    const [i, j] = readIndices(state);

    if (input.blocked.has(coordinateKey(i, j))) {
      return { isBase: true, value: 0 };
    }

    if (i === 0 && j === 0) {
      return { isBase: true, value: 1 };
    }

    return { isBase: false };
  },
  transition: (state, ctx) => {
    const [i, j] = readIndices(state);
    let total = 0;

    if (i > 0) {
      total += ctx.read([i - 1, j]);
    }

    if (j > 0) {
      total += ctx.read([i, j - 1]);
    }

    return total;
  },
  iterationOrder: function* (input) {
    for (let i = 0; i < input.rows; i += 1) {
      for (let j = 0; j < input.columns; j += 1) {
        yield [i, j];
      }
    }
  },
  extractAnswer: (input, read) => read([input.rows - 1, input.columns - 1])
};

function readIndices(state: StateCoordinates): [number, number] {
  const i = state[0];
  const j = state[1];

  if (i === undefined || j === undefined) {
    throw new Error("Unique Paths II expects two-dimensional state.");
  }

  return [i, j];
}

export function coordinateKey(row: number, column: number): string {
  return `${row},${column}`;
}
