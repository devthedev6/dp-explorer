import type { ProblemSpec } from "@dp-explorer/core";
import { fibonacciSpec } from "./fibonacci";
import { longestCommonSubsequenceSpec } from "./longest-common-subsequence";
import { editDistanceSpec } from "./edit-distance";
import { knapsackSpec } from "./knapsack";
import { uniquePathsIISpec } from "./unique-paths-ii";

export interface RegisteredTemplate {
  readonly id: string;
  readonly name: string;
  readonly spec: ProblemSpec<unknown>;
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
  spec: fibonacciSpec as ProblemSpec<unknown>,
  defaultInput: { n: 5 }
});

templateRegistry.register({
  id: longestCommonSubsequenceSpec.id,
  name: longestCommonSubsequenceSpec.name,
  spec: longestCommonSubsequenceSpec as ProblemSpec<unknown>,
  defaultInput: { first: "ABCDGH", second: "AEDFHR" }
});

templateRegistry.register({
  id: editDistanceSpec.id,
  name: editDistanceSpec.name,
  spec: editDistanceSpec as ProblemSpec<unknown>,
  defaultInput: { first: "kitten", second: "sitting" }
});

templateRegistry.register({
  id: knapsackSpec.id,
  name: knapsackSpec.name,
  spec: knapsackSpec as ProblemSpec<unknown>,
  defaultInput: { capacity: 7, weights: "1,3,4,5", values: "1,4,5,7" }
});

templateRegistry.register({
  id: uniquePathsIISpec.id,
  name: uniquePathsIISpec.name,
  spec: uniquePathsIISpec as ProblemSpec<unknown>,
  defaultInput: { rows: 3, columns: 3, blocked: "1,1\n2,0" }
});
