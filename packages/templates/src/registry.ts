import type { FunctionalProblemSpec, PropagationProblemSpec } from "@dp-explorer/core";
import { fibonacciSpec } from "./fibonacci";
import { longestCommonSubsequenceSpec } from "./longest-common-subsequence";
import { editDistanceSpec } from "./edit-distance";
import { knapsackSpec } from "./knapsack";
import { uniquePathsIISpec } from "./unique-paths-ii";
import { minimumPathSumSpec } from "./minimum-path-sum";
import { coinChangeSpec } from "./coin-change";
import { gridPathsPropagationSpec } from "./grid-paths-propagation";

export type TemplateExecutionModel = "functional" | "propagation";

export type RegisteredTemplate = RegisteredFunctionalTemplate | RegisteredPropagationTemplate;

export interface RegisteredFunctionalTemplate {
  readonly id: string;
  readonly name: string;
  readonly executionModel: "functional";
  readonly spec: FunctionalProblemSpec<unknown>;
  readonly defaultInput: Readonly<Record<string, unknown>>;
}

export interface RegisteredPropagationTemplate {
  readonly id: string;
  readonly name: string;
  readonly executionModel: "propagation";
  readonly spec: PropagationProblemSpec<unknown>;
  readonly defaultInput: Readonly<Record<string, unknown>>;
}

/**
 * Minimal mutable registry for DP templates.
 *
 * New templates are added only here by calling registerTemplate; the rest of
 * the architecture consumes the registry generically.
 */
class TemplateRegistry {
  readonly #templates = new Map<string, RegisteredTemplate>();

  register(template: RegisteredTemplate): void {
    if (this.#templates.has(template.id)) {
      throw new Error(`Template "${template.id}" is already registered.`);
    }

    this.#templates.set(template.id, template);
  }

  get(id: string): RegisteredTemplate | undefined {
    return this.#templates.get(id);
  }

  list(): readonly RegisteredTemplate[] {
    return Array.from(this.#templates.values());
  }
}

export const templateRegistry = new TemplateRegistry();

templateRegistry.register({
  id: fibonacciSpec.id,
  name: fibonacciSpec.name,
  executionModel: "functional",
  spec: fibonacciSpec as FunctionalProblemSpec<unknown>,
  defaultInput: { n: 5 }
});

templateRegistry.register({
  id: longestCommonSubsequenceSpec.id,
  name: longestCommonSubsequenceSpec.name,
  executionModel: "functional",
  spec: longestCommonSubsequenceSpec as FunctionalProblemSpec<unknown>,
  defaultInput: { first: "ABCDGH", second: "AEDFHR" }
});

templateRegistry.register({
  id: editDistanceSpec.id,
  name: editDistanceSpec.name,
  executionModel: "functional",
  spec: editDistanceSpec as FunctionalProblemSpec<unknown>,
  defaultInput: { first: "kitten", second: "sitting" }
});

templateRegistry.register({
  id: knapsackSpec.id,
  name: knapsackSpec.name,
  executionModel: "functional",
  spec: knapsackSpec as FunctionalProblemSpec<unknown>,
  defaultInput: { capacity: 7, weights: "1,3,4,5", values: "1,4,5,7" }
});

templateRegistry.register({
  id: uniquePathsIISpec.id,
  name: uniquePathsIISpec.name,
  executionModel: "functional",
  spec: uniquePathsIISpec as FunctionalProblemSpec<unknown>,
  defaultInput: { rows: 3, columns: 3, blocked: "1,1\n2,0" }
});

templateRegistry.register({
  id: minimumPathSumSpec.id,
  name: minimumPathSumSpec.name,
  executionModel: "functional",
  spec: minimumPathSumSpec as FunctionalProblemSpec<unknown>,
  defaultInput: {
    rows: 3,
    columns: 3,
    grid: [
      [1, 3, 1],
      [1, 5, 1],
      [4, 2, 1]
    ]
  }
});

templateRegistry.register({
  id: coinChangeSpec.id,
  name: coinChangeSpec.name,
  executionModel: "functional",
  spec: coinChangeSpec as FunctionalProblemSpec<unknown>,
  defaultInput: { coins: "1,3,4", target: 6 }
});

templateRegistry.register({
  id: gridPathsPropagationSpec.id,
  name: gridPathsPropagationSpec.name,
  executionModel: "propagation",
  spec: gridPathsPropagationSpec as PropagationProblemSpec<unknown>,
  defaultInput: { rows: 3, columns: 3 }
});
