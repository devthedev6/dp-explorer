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

/** A seed value for propagation-based dynamic programming. */
export interface BuilderPropagationInitialState {
  readonly id: string;
  readonly stateExpression: string;
  readonly valueExpression: string;
}

/** A guarded update emitted from one propagation state to a successor. */
export interface BuilderPropagationTransition {
  readonly id: string;
  readonly conditionExpression: string | null;
  readonly targetStateExpression: string;
  readonly contributionExpression: string;
}

export type PropagationAggregationKind = "sum" | "minimum" | "maximum";

/** The supported declarative scheduling abstraction for propagation. */
export type PropagationScheduleKind = "state-space-order";

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

/**
 * Builder representation for a propagation specification.
 *
 * It intentionally does not reuse functional base cases, recurrence
 * transitions, root states, or execution modes.
 */
export interface PropagationBuilderState {
  readonly metadata: BuilderState["metadata"];
  readonly symbols: readonly BuilderSymbol[];
  readonly state: BuilderState["state"];
  readonly initialStates: readonly BuilderPropagationInitialState[];
  readonly transitions: readonly BuilderPropagationTransition[];
  readonly aggregation: PropagationAggregationKind;
  readonly schedule: PropagationScheduleKind;
  readonly answerExpression: string;
}
