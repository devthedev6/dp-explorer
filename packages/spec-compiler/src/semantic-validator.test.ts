import { describe, expect, it } from "vitest";
import type { BuilderState } from "./builder-state";
import { parseSpecification } from "./parser";
import { validateSpecification } from "./semantic-validator";

describe("validateSpecification", () => {
  it("produces a ValidatedSpecification for a valid parsed specification", () => {
    const result = validateBuilderState(createBuilderState());

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected semantic validation to succeed.");
    }

    expect(result.validatedSpecification.parsedSpecification).toBeDefined();
    expect(Object.isFrozen(result.validatedSpecification)).toBe(true);
    expect(result.validatedSpecification.symbols).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "n", kind: "primitive" }),
        expect.objectContaining({ name: "grid", kind: "array", dimensions: 2 }),
        expect.objectContaining({ name: "MOD", kind: "constant" }),
        expect.objectContaining({ name: "i", kind: "state-variable" }),
        expect.objectContaining({ name: "j", kind: "state-variable" }),
        expect.objectContaining({ name: "DP", kind: "built-in-function" })
      ])
    );
  });

  it("detects undefined symbols", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      answerExpression: "DP(n, missing)"
    });

    expectDiagnostics(result, ['Undefined identifier "missing".']);
  });

  it("detects invalid DP dimensions", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      answerExpression: "DP(n)"
    });

    expectDiagnostics(result, ["DP expects 2 indices but received 1."]);
  });

  it("detects invalid array indexing", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      transitions: [
        {
          id: "transition-1",
          conditionExpression: null,
          valueExpression: "grid[i] + DP(i - 1, j)"
        }
      ]
    });

    expectDiagnostics(result, ['Array "grid" expects 2 indices but received 1.']);
  });

  it("detects reserved keyword misuse", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      symbols: [
        ...createBuilderState().symbols,
        {
          id: "symbol-dp",
          name: "DP",
          category: "primitive",
          primitiveType: "integer"
        }
      ]
    });

    expectDiagnostics(result, ['Identifier "DP" is reserved and cannot be redefined.']);
  });

  it("detects duplicate declarations", () => {
    const state = createBuilderState();
    const result = validateBuilderState({
      ...state,
      symbols: [
        ...state.symbols,
        {
          id: "symbol-n-duplicate",
          name: "n",
          category: "constant",
          value: "2"
        }
      ],
      state: {
        ...state.state,
        variables: [
          ...state.state.variables,
          {
            name: "i",
            lowerBoundExpression: "0",
            upperBoundExpression: "n"
          }
        ],
        dimensionCount: 3
      },
      rootStateExpression: "DP(n, n, n)",
      answerExpression: "DP(n, n, n)"
    });

    expectDiagnostics(result, ['Duplicate declaration for "n".', 'Duplicate declaration for "i".']);
  });

  it("detects invalid rows, cols, and len calls", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      transitions: [
        {
          id: "transition-1",
          conditionExpression: "rows(n) > 0",
          valueExpression: "cols(coins) + len(MOD)"
        }
      ]
    });

    expectDiagnostics(result, [
      "rows expects a declared array with at least two dimensions.",
      "cols expects a declared array with at least two dimensions.",
      "len expects a declared array or string primitive."
    ]);
  });

  it("detects unknown function calls", () => {
    const result = validateBuilderState({
      ...createBuilderState(),
      answerExpression: "mystery(DP(n, n))"
    });

    expectDiagnostics(result, ['Unknown function call "mystery".']);
  });
});

function validateBuilderState(builderState: BuilderState) {
  const parseResult = parseSpecification(builderState);
  if (!parseResult.success) {
    throw new Error("Test builder state should parse before semantic validation.");
  }

  return validateSpecification(parseResult.parsedSpecification);
}

function expectDiagnostics(
  result: ReturnType<typeof validateBuilderState>,
  expectedMessages: readonly string[]
): void {
  expect(result.success).toBe(false);
  if (result.success) {
    throw new Error("Expected semantic validation to fail.");
  }

  expect(result.diagnostics.map((diagnostic) => diagnostic.message)).toEqual(
    expect.arrayContaining([...expectedMessages])
  );
  expect(result.validatedSpecification).toBeNull();
}

function createBuilderState(): BuilderState {
  return {
    metadata: {
      name: "Grid DP",
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
        id: "symbol-word",
        name: "word",
        category: "primitive",
        primitiveType: "string"
      },
      {
        id: "symbol-grid",
        name: "grid",
        category: "array",
        primitiveType: "integer",
        dimensions: 2
      },
      {
        id: "symbol-coins",
        name: "coins",
        category: "array",
        primitiveType: "integer",
        dimensions: 1
      },
      {
        id: "symbol-mod",
        name: "MOD",
        category: "constant",
        value: "1000000007"
      }
    ],
    state: {
      dimensionCount: 2,
      variables: [
        {
          name: "i",
          lowerBoundExpression: "0",
          upperBoundExpression: "rows(grid)"
        },
        {
          name: "j",
          lowerBoundExpression: "0",
          upperBoundExpression: "cols(grid)"
        }
      ],
      meaning: "dp[i][j]"
    },
    baseCases: [
      {
        id: "base-0",
        conditionExpression: "i == 0",
        valueExpression: "grid[i][j]"
      }
    ],
    transitions: [
      {
        id: "transition-1",
        conditionExpression: "len(word) >= 0",
        valueExpression: "max(DP(i - 1, j), DP(i, j - 1)) + grid[i][j] + bitXor(1, 2)"
      }
    ],
    rootStateExpression: "DP(n, n)",
    answerExpression: "DP(n, n)",
    executionMode: "bottom-up"
  };
}
