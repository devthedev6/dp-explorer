import { describe, expect, it } from "vitest";
import type { BuilderState } from "./builder-state";
import { parseSpecification } from "./parser";

describe("parseSpecification", () => {
  it("parses a valid BuilderState into MathJS ASTs", () => {
    const builderState = createBuilderState();

    const result = parseSpecification(builderState);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected parsing to succeed.");
    }

    expect(result.parsedSpecification.builderState).toBe(builderState);
    expect(result.parsedSpecification.parsedBaseCaseConditions[0]?.ast.type).toBe("OperatorNode");
    expect(result.parsedSpecification.parsedBaseCaseExpressions[0]?.ast.type).toBe("ConstantNode");
    expect(result.parsedSpecification.parsedTransitionExpressions[0]?.ast.type).toBe(
      "OperatorNode"
    );
    expect(result.parsedSpecification.parsedInitialValueExpression.ast.type).toBe("ConstantNode");
    expect(result.parsedSpecification.parsedRootState.ast.type).toBe("FunctionNode");
    expect(result.parsedSpecification.parsedAnswerExpression.ast.type).toBe("FunctionNode");
    expect(Object.isFrozen(result.parsedSpecification.parsedAnswerExpression.ast)).toBe(true);
  });

  it("returns diagnostics for invalid mathematical syntax", () => {
    const builderState = {
      ...createBuilderState(),
      transitions: [
        {
          id: "transition-1",
          conditionExpression: null,
          valueExpression: "DP(i - 1) +"
        }
      ]
    } satisfies BuilderState;

    const result = parseSpecification(builderState);

    expect(result.success).toBe(false);
    expect(result.parsedSpecification).toBeNull();
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        severity: "error",
        kind: "transition-expression",
        expression: "DP(i - 1) +",
        path: ["transitions", 0, "valueExpression"]
      })
    ]);
  });

  it("does not mutate BuilderState", () => {
    const builderState = createBuilderState();
    const before = JSON.stringify(builderState);

    parseSpecification(builderState);

    expect(JSON.stringify(builderState)).toBe(before);
  });
});

function createBuilderState(): BuilderState {
  return {
    metadata: {
      name: "Fibonacci",
      description: "Test specification"
    },
    symbols: [
      {
        id: "symbol-n",
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      },
      {
        id: "symbol-mod",
        name: "MOD",
        category: "constant",
        value: "1000000007"
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
        conditionExpression: "i >= 2",
        valueExpression: "DP(i - 1) + DP(i - 2)"
      }
    ],
    initialValueExpression: "0",
    rootStateExpression: "DP(n)",
    answerExpression: "DP(n)",
    executionMode: "top-down"
  };
}
