import type { ProblemSpec, StateCoordinates } from "@dp-explorer/core";

export interface CoinChangeInput {
  readonly coins: readonly number[];
  readonly target: number;
}

const UNREACHABLE = Number.POSITIVE_INFINITY;

/**
 * Coin Change (Minimum Coins) ProblemSpec.
 *
 * State x represents the minimum number of coins required to make amount x.
 * dp[0] is 0. All other states start unreachable. For each coin not larger
 * than x, consider using that coin once and taking the minimum over all
 * candidates.
 */
export const coinChangeSpec: ProblemSpec<CoinChangeInput> = {
  id: "coin-change",
  name: "Coin Change",
  title: "Coin Change (Minimum Coins)",
  description:
    "Given a set of coin denominations and a target amount, compute the minimum number of coins required to make the target. Each coin may be used any number of times.",
  formulation: {
    title: "Coin Change (Minimum Coins)",
    problemStatement:
      "Given a set of coin denominations and a target amount, compute the minimum number of coins required to make the target. Each coin may be used any number of times.",
    stateDefinition: "dp[x] represents the minimum number of coins required to make amount x.",
    baseCases: "dp[0] = 0. All other states are initially unreachable.",
    transition:
      "For every coin whose value is not greater than x, consider dp[x - coin] and take 1 + dp[x - coin]. Choose the minimum among all valid choices. If no transition is possible, the state remains unreachable.",
    timeComplexity: "O(number_of_coins × target)",
    spaceComplexity: "O(target)"
  },
  stateVariables: ["x"],
  inputSchema: [
    {
      name: "coins",
      label: "Coins (comma-separated)",
      type: "string",
      maxLength: 64,
      description: "Comma-separated positive integer coin denominations."
    },
    { name: "target", label: "Target Amount", type: "integer", min: 0, max: 50 }
  ],
  dimensions: (input) => [input.target + 1],
  baseCase: (state) => {
    const x = readIndex(state);

    if (x === 0) {
      return { isBase: true, value: 0 };
    }

    return { isBase: false };
  },
  transition: (state, ctx) => {
    const input = ctx.input;
    const x = readIndex(state);
    let best = UNREACHABLE;

    for (const coin of input.coins) {
      if (coin <= x) {
        const candidate = 1 + ctx.read([x - coin]);

        if (candidate < best) {
          best = candidate;
        }
      }
    }

    return best;
  },
  iterationOrder: function* (input) {
    for (let x = 0; x <= input.target; x += 1) {
      yield [x];
    }
  },
  extractAnswer: (input, read) => read([input.target])
};

function readIndex(state: StateCoordinates): number {
  const x = state[0];

  if (x === undefined) {
    throw new Error("Coin Change expects one-dimensional state.");
  }

  return x;
}
