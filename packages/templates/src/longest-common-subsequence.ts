import type { FunctionalProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface LongestCommonSubsequenceInput {
  readonly first: string;
  readonly second: string;
}

/**
 * Longest Common Subsequence (LCS) functional specification.
 *
 * State (i, j) represents the LCS length of the suffixes first[i:] and
 * second[j:]. Base cases occur when either suffix is empty. The recurrence
 * matches characters at i and j, otherwise takes the best of skipping either
 * character.
 */
export const longestCommonSubsequenceSpec: FunctionalProblemSpec<LongestCommonSubsequenceInput> = {
  id: "longest-common-subsequence",
  name: "Longest Common Subsequence",
  title: "Longest Common Subsequence",
  description:
    "Given two strings, compute the length of their longest common subsequence. A subsequence preserves relative order but characters do not need to be contiguous.",
  formulation: {
    title: "Longest Common Subsequence",
    problemStatement: "Given two strings, compute the length of their longest common subsequence.",
    stateDefinition:
      "dp[i][j] represents length of LCS between first i characters of first string and first j characters of second string.",
    baseCases:
      "If either string has length 0, there are no common characters. Therefore, dp[i][0]=dp[0][j]=0.",
    transition:
      "Current State: dp[i][j]\n\nIf the last characters of the two prefixes are equal,include that character and move to dp[i-1][j-1].\n\nOtherwise,compare:\n dp[i-1][j] and dp[i][j-1]\nand take the larger of the two values.",
    timeComplexity: "O(nm)",
    spaceComplexity: "O(nm)"
  },
  stateVariables: ["i", "j"],
  inputSchema: [
    { name: "first", label: "First string", type: "string", maxLength: 8 },
    { name: "second", label: "Second string", type: "string", maxLength: 8 }
  ],
  dimensions: (input) => [input.first.length + 1, input.second.length + 1],
  rootState: (input) => [input.first.length, input.second.length],
  baseCase: (state) => {
    const [i, j] = readIndices(state);

    if (i === 0 || j === 0) {
      return { isBase: true, value: 0 };
    }

    return { isBase: false };
  },
  transition: (state, ctx) => {
    const input = ctx.input;
    const [i, j] = readIndices(state);

    if (input.first[i - 1] === input.second[j - 1]) {
      return 1 + ctx.read([i - 1, j - 1]);
    }

    return Math.max(ctx.read([i - 1, j]), ctx.read([i, j - 1]));
  },
  iterationOrder: function* (input) {
    for (let i = 0; i <= input.first.length; i += 1) {
      for (let j = 0; j <= input.second.length; j += 1) {
        yield [i, j];
      }
    }
  },
  extractAnswer: (ctx) => ctx.read([ctx.input.first.length, ctx.input.second.length])
};

function readIndices(state: StateCoordinates): [number, number] {
  const i = state[0];
  const j = state[1];

  if (i === undefined || j === undefined) {
    throw new Error("LCS expects two-dimensional state.");
  }

  return [i, j];
}
