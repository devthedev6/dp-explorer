export type PrimitiveType = "integer" | "double" | "boolean" | "character" | "string";

export type SymbolCategory = "primitive" | "array" | "constant";

export interface BuilderSymbol {
  readonly id: string;
  readonly name: string;
  readonly category: SymbolCategory;
  readonly primitiveType?: PrimitiveType;
  readonly dimensions?: number;
  readonly value?: string;
}

export interface BuilderStateVariable {
  readonly name: string;
  readonly lowerBoundExpression: string;
  readonly upperBoundExpression: string;
  readonly description?: string;
}

export interface BuilderBaseCase {
  readonly id: string;
  readonly conditionExpression: string;
  readonly valueExpression: string;
}

export interface BuilderTransition {
  readonly id: string;
  readonly conditionExpression: string | null;
  readonly valueExpression: string;
}

export type ExecutionMode = "top-down" | "bottom-up";

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
