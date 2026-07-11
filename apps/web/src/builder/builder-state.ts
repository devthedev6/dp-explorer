/**
 * Intermediate representation produced by the Specification Builder.
 *
 * BuilderState deliberately mirrors the stages of the visual wizard. It is
 * NOT a ProblemSpec; the semantic compiler will transform a completed
 * BuilderState into a runtime ProblemSpec in later sessions.
 */

/** Supported primitive input types for symbol declarations. */
export type PrimitiveType = "integer" | "double" | "boolean" | "character" | "string";

/** Categories of identifiers that can live in the symbol table. */
export type SymbolCategory = "primitive" | "array" | "constant";

/** A single user-declared symbol. */
export interface BuilderSymbol {
  readonly id: string;
  readonly name: string;
  readonly category: SymbolCategory;
  readonly primitiveType?: PrimitiveType;
  /** Only meaningful for arrays. */
  readonly dimensions?: number;
  /** Only meaningful for constants (string expression value). */
  readonly value?: string;
}

/** A DP state variable together with its bound expressions. */
export interface BuilderStateVariable {
  readonly name: string;
  readonly lowerBoundExpression: string;
  readonly upperBoundExpression: string;
  readonly description?: string;
}

/** A base case: condition expression plus value expression. */
export interface BuilderBaseCase {
  readonly id: string;
  readonly conditionExpression: string;
  readonly valueExpression: string;
}

/** A transition: optional guard plus recurrence expression. */
export interface BuilderTransition {
  readonly id: string;
  readonly conditionExpression: string | null;
  readonly valueExpression: string;
}

/** Execution strategies supported by the runtime. */
export type ExecutionMode = "top-down" | "bottom-up";

/**
 * The complete intermediate representation for the Specification Builder.
 *
 * Every field is readonly so that updates are always explicit and immutable.
 */
export interface BuilderState {
  readonly metadata: {
    readonly name: string;
    readonly description: string;
  };
  readonly symbols: readonly BuilderSymbol[];
  readonly state: {
    readonly dimensionCount: number;
    readonly variables: readonly BuilderStateVariable[];
    readonly meaning: string;
  };
  readonly baseCases: readonly BuilderBaseCase[];
  readonly transitions: readonly BuilderTransition[];
  readonly initialValueExpression?: string;
  readonly rootStateExpression: string;
  readonly answerExpression: string;
  readonly executionMode: ExecutionMode;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Sensible default/placeholder BuilderState used when the wizard starts. */
export function createDefaultBuilderState(): BuilderState {
  return {
    metadata: {
      name: "My Custom DP",
      description: "Describe your dynamic programming problem here."
    },
    symbols: [
      {
        id: createId(),
        name: "n",
        category: "primitive",
        primitiveType: "integer"
      },
      {
        id: createId(),
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
          upperBoundExpression: "n",
          description: "Dp(i) represents the answer for subproblem i."
        }
      ],
      meaning: "dp[i] — placeholder state meaning."
    },
    baseCases: [
      {
        id: createId(),
        conditionExpression: "i == 0",
        valueExpression: "0"
      },
      {
        id: createId(),
        conditionExpression: "i == 1",
        valueExpression: "1"
      }
    ],
    transitions: [
      {
        id: createId(),
        conditionExpression: null,
        valueExpression: "dp(i - 1) + dp(i - 2)"
      }
    ],
    initialValueExpression: "0",
    rootStateExpression: "n",
    answerExpression: "dp(n)",
    executionMode: "top-down"
  };
}
