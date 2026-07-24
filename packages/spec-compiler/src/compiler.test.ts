import { createExtractionContext, runBottomUp } from "@dp-explorer/core";
import { describe, expect, it } from "vitest";
import type { BuilderState } from "./builder-state";
import { compileSpecification } from "./compiler";

describe("compileSpecification", () => {
  it("successfully composes the compiler pipeline", () => {
    const result = compileSpecification(createFibonacciBuilderState());

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected compilation to succeed.");
    }

    expect(Object.isFrozen(result)).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.problemSpec.name).toBe("Fibonacci");
    expect(result.problemSpec.rootState({ n: 6 })).toEqual([6]);
  });

  it("returns parse diagnostics through CompileResult", () => {
    const result = compileSpecification({
      ...createFibonacciBuilderState(),
      transitions: [
        {
          id: "transition-1",
          conditionExpression: null,
          valueExpression: "DP(i - 1) +"
        }
      ]
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected compilation to fail.");
    }

    expect("problemSpec" in result).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        kind: "transition-expression",
        expression: "DP(i - 1) +"
      })
    ]);
  });

  it("returns semantic diagnostics through CompileResult", () => {
    const result = compileSpecification({
      ...createFibonacciBuilderState(),
      answerExpression: "DP(missing)"
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected compilation to fail.");
    }

    expect("problemSpec" in result).toBe(false);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        message: 'Undefined identifier "missing".',
        expression: "DP(missing)"
      })
    ]);
  });

  it("returns a working functional specification on successful compilation", () => {
    const result = compileSpecification(createFibonacciBuilderState());
    if (!result.success) {
      throw new Error("Expected compilation to succeed.");
    }

    const execution = runBottomUp(result.problemSpec, { n: 6 });
    const context = createExtractionContext(execution);

    expect(result.problemSpec.extractAnswer(context)).toBe(8);
    expect([...execution.dpTable.values()]).toEqual([0, 1, 1, 2, 3, 5, 8]);
  });
});

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
    rootStateExpression: "DP(n)",
    answerExpression: "DP(n)",
    executionMode: "bottom-up"
  };
}
