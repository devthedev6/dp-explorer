import type { MathNode } from "mathjs";
import type { BuilderState } from "./builder-state";

export interface ParsedExpression {
  readonly source: string;
  readonly ast: MathNode;
}

export interface ParsedConstant {
  readonly symbolId: string;
  readonly name: string;
  readonly value: ParsedExpression;
}

export interface ParsedStateVariable {
  readonly name: string;
  readonly lowerBound: ParsedExpression;
  readonly upperBound: ParsedExpression;
}

export interface ParsedBaseCase {
  readonly id: string;
  readonly condition: ParsedExpression;
  readonly value: ParsedExpression;
}

export interface ParsedTransition {
  readonly id: string;
  readonly condition: ParsedExpression | null;
  readonly value: ParsedExpression;
}

export interface ParsedSpecification {
  readonly builderState: BuilderState;
  readonly parsedConstants: readonly ParsedConstant[];
  readonly parsedStateVariables: readonly ParsedStateVariable[];
  readonly parsedBaseCaseConditions: readonly ParsedExpression[];
  readonly parsedBaseCaseExpressions: readonly ParsedExpression[];
  readonly parsedBaseCases: readonly ParsedBaseCase[];
  readonly parsedTransitionConditions: readonly (ParsedExpression | null)[];
  readonly parsedTransitionExpressions: readonly ParsedExpression[];
  readonly parsedTransitions: readonly ParsedTransition[];
  readonly parsedInitialValueExpression: ParsedExpression;
  readonly parsedRootState: ParsedExpression;
  readonly parsedAnswerExpression: ParsedExpression;
}
