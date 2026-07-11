import { createExtractionContext, runBottomUp, runTopDown } from "@dp-explorer/core";
import { describe, expect, it } from "vitest";
import type { BuilderState } from "./builder-state";
import { parseSpecification } from "./parser";
import { generateProblemSpec } from "./problem-spec-generator";
import { validateSpecification } from "./semantic-validator";

describe("generateProblemSpec", () => {
  it("compiles a valid BuilderState into a working ProblemSpec", () => {
    const spec = compileBuilderState(createFibonacciBuilderState());

    expect(spec.id).toBe("generated-fibonacci");
    expect(spec.name).toBe("Fibonacci");
    expect(spec.stateVariables).toEqual(["i"]);
    expect(spec.dimensions({ n: 6 })).toEqual([7]);
    expect(spec.rootState({ n: 6 })).toEqual([6]);
    expect(spec.baseCase([1], { n: 6 })).toEqual({ isBase: true, value: 1 });
    expect(spec.transition([4], { input: { n: 6 }, read: (state) => state[0] ?? 0 })).toBe(5);
  });

  it("executes correctly using the existing top-down runtime", () => {
    const spec = compileBuilderState(createFibonacciBuilderState());
    const result = runTopDown(spec, { n: 6 });
    const context = createExtractionContext(result);

    expect(spec.extractAnswer(context)).toBe(8);
    expect(result.dpTable.get("6" as never)).toBe(8);
  });

  it("executes correctly using the existing bottom-up runtime", () => {
    const spec = compileBuilderState(createFibonacciBuilderState());
    const result = runBottomUp(spec, { n: 6 });
    const context = createExtractionContext(result);

    expect(spec.extractAnswer(context)).toBe(8);
    expect([...result.dpTable.values()]).toEqual([0, 1, 1, 2, 3, 5, 8]);
  });

  it("evaluates arrays, constants, built-ins, comparison, logical, and bitwise expressions", () => {
    const spec = compileBuilderState(createArrayBuilderState());
    const input = { n: 2, values: [3, 4, 5], word: "abc" };
    const result = runBottomUp(spec, input);
    const context = createExtractionContext(result);

    expect(spec.dimensions(input)).toEqual([3]);
    expect(spec.extractAnswer(context)).toBe(15);
    expect([...result.dpTable.values()]).toEqual([4, 9, 15]);
  });

  it("evaluates initial DP values for generated ProblemSpecs", () => {
    const spec = compileBuilderState({
      ...createFibonacciBuilderState(),
      symbols: [
        ...createFibonacciBuilderState().symbols,
        {
          id: "symbol-seed",
          name: "seed",
          category: "primitive",
          primitiveType: "integer"
        }
      ],
      initialValueExpression: "seed + 1"
    });

    expect(spec.initialValue?.({ n: 2, seed: 40 })).toBe(41);
  });

  it("compiles and executes primitive string indexing", () => {
    const spec = compileBuilderState(createStringIndexingBuilderState());
    const input = { s: "abc" };
    const result = runBottomUp(spec, input);
    const context = createExtractionContext(result);

    expect(spec.dimensions(input)).toEqual([3]);
    expect(spec.extractAnswer(context)).toBe(3);
  });
});

function compileBuilderState(builderState: BuilderState) {
  const parseResult = parseSpecification(builderState);
  if (!parseResult.success) {
    throw new Error("Expected test BuilderState to parse.");
  }

  const validationResult = validateSpecification(parseResult.parsedSpecification);
  if (!validationResult.success) {
    throw new Error("Expected test BuilderState to validate.");
  }

  return generateProblemSpec(validationResult.validatedSpecification);
}

function createFibonacciBuilderState(): BuilderState {
  return {
    metadata: {
      name: "Fibonacci",
      description: "Generated Fibonacci specification"
    },
    symbols: [
      {
        id: "symbol-n",
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      }
    ],
    state: {
      dimensionCount: 1,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "n"
        }
      ],
      meaning: "dp[i]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "0"
      },
      {
        id: "base-1",
        conditionExpression: "i == 1",
        valueExpression: "1"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: null,
        valueExpression: "DP(i - 1) + DP(i - 2)"
      }
    ],
    initialValueExpression: "0",
    rootStateExpression: "DP(n)",
    answerExpression: "DP(n)",
    executionMode: "bottom-up"
  };
}

function createArrayBuilderState(): BuilderState {
  return {
    metadata: {
      name: "Array Sum",
      description: "Generated array sum specification"
    },
    symbols: [
      {
        id: "symbol-n",
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      },
      {
        id: "symbol-word",
        name: "word",
        category: "primitive",
        primitiveType: "string"
      },
      {
        id: "symbol-values",
        name: "values",
        category: "array",
        primitiveType: "integer",
        dimensions: 1
      },
      {
        id: "symbol-bonus",
        name: "BONUS",
        category: "constant",
        value: "bitXor(1, 3)"
      }
    ],
    state: {
      dimensionCount: 1,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "len(values) - 1"
        }
      ],
      meaning: "dp[i]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "values[i] + floor(1.8)"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: "i > 0 and len(word) == 3",
        valueExpression: "DP(i - 1) + values[i] + min(abs(-1), ceil(0.2)) + (BONUS & 1)"
      }
    ],
    initialValueExpression: "0",
    rootStateExpression: "DP(n)",
    answerExpression: "max(DP(n), 0)",
    executionMode: "bottom-up"
  };
}

function createStringIndexingBuilderState(): BuilderState {
  return {
    metadata: {
      name: "String Indexing",
      description: "Generated string indexing specification"
    },
    symbols: [
      {
        id: "symbol-s",
        name: "s",
        category: "primitive",
        primitiveType: "string"
      }
    ],
    state: {
      dimensionCount: 1,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "len(s) - 1"
        }
      ],
      meaning: "dp[i]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "s[0] == s[i]"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: null,
        valueExpression: "DP(i - 1) + (s[i] == s[i])"
      }
    ],
    initialValueExpression: "0",
    rootStateExpression: "DP(len(s) - 1)",
    answerExpression: "DP(len(s) - 1)",
    executionMode: "bottom-up"
  };
}
