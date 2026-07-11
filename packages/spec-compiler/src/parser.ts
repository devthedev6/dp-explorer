import { parse, type MathNode } from "mathjs";
import type { BuilderState } from "./builder-state";
import type { ParseDiagnostic, ParseExpressionKind, ParseSpecificationResult } from "./diagnostics";
import type { ParsedExpression, ParsedSpecification } from "./parsed-specification";

interface ParseTarget {
  readonly kind: ParseExpressionKind;
  readonly expression: string;
  readonly path: readonly (string | number)[];
}

interface ParsedTarget extends ParseTarget {
  readonly parsed: ParsedExpression;
}

export function parseSpecification(builderState: BuilderState): ParseSpecificationResult {
  const parsedByPath = new Map<string, ParsedExpression>();
  const diagnostics: ParseDiagnostic[] = [];

  for (const target of collectParseTargets(builderState)) {
    const parsed = parseExpression(target);
    if (parsed.success) {
      parsedByPath.set(pathKey(target.path), parsed.target.parsed);
    } else {
      diagnostics.push(parsed.diagnostic);
    }
  }

  if (diagnostics.length > 0) {
    return {
      success: false,
      diagnostics,
      parsedSpecification: null
    };
  }

  return {
    success: true,
    diagnostics: [],
    parsedSpecification: createParsedSpecification(builderState, parsedByPath)
  };
}

function collectParseTargets(builderState: BuilderState): ParseTarget[] {
  const targets: ParseTarget[] = [];

  builderState.symbols.forEach((symbol, index) => {
    if (symbol.category === "constant" && symbol.value !== undefined) {
      targets.push({
        kind: "constant",
        expression: symbol.value,
        path: ["symbols", index, "value"]
      });
    }
  });

  builderState.state.variables.forEach((variable, index) => {
    targets.push({
      kind: "state-lower-bound",
      expression: variable.lowerBoundExpression,
      path: ["state", "variables", index, "lowerBoundExpression"]
    });
    targets.push({
      kind: "state-upper-bound",
      expression: variable.upperBoundExpression,
      path: ["state", "variables", index, "upperBoundExpression"]
    });
  });

  builderState.baseCases.forEach((baseCase, index) => {
    targets.push({
      kind: "base-case-condition",
      expression: baseCase.conditionExpression,
      path: ["baseCases", index, "conditionExpression"]
    });
    targets.push({
      kind: "base-case-expression",
      expression: baseCase.valueExpression,
      path: ["baseCases", index, "valueExpression"]
    });
  });

  builderState.transitions.forEach((transition, index) => {
    if (transition.conditionExpression !== null) {
      targets.push({
        kind: "transition-condition",
        expression: transition.conditionExpression,
        path: ["transitions", index, "conditionExpression"]
      });
    }
    targets.push({
      kind: "transition-expression",
      expression: transition.valueExpression,
      path: ["transitions", index, "valueExpression"]
    });
  });

  targets.push({
    kind: "initial-value-expression",
    expression: builderState.initialValueExpression ?? "0",
    path: ["initialValueExpression"]
  });
  targets.push({
    kind: "root-state",
    expression: builderState.rootStateExpression,
    path: ["rootStateExpression"]
  });
  targets.push({
    kind: "answer-expression",
    expression: builderState.answerExpression,
    path: ["answerExpression"]
  });

  return targets;
}

function parseExpression(target: ParseTarget):
  | { readonly success: true; readonly target: ParsedTarget }
  | {
      readonly success: false;
      readonly diagnostic: ParseDiagnostic;
    } {
  try {
    return {
      success: true,
      target: {
        ...target,
        parsed: {
          source: target.expression,
          ast: deepFreeze(parse(target.expression))
        }
      }
    };
  } catch (error) {
    return {
      success: false,
      diagnostic: {
        severity: "error",
        message: error instanceof Error ? error.message : "Unable to parse expression.",
        expression: target.expression,
        kind: target.kind,
        path: target.path
      }
    };
  }
}

function createParsedSpecification(
  builderState: BuilderState,
  parsedByPath: ReadonlyMap<string, ParsedExpression>
): ParsedSpecification {
  const parsedConstants = builderState.symbols.flatMap((symbol, index) => {
    if (symbol.category !== "constant" || symbol.value === undefined) {
      return [];
    }
    return [
      {
        symbolId: symbol.id,
        name: symbol.name,
        value: getParsed(parsedByPath, ["symbols", index, "value"])
      }
    ];
  });

  const parsedStateVariables = builderState.state.variables.map((variable, index) => ({
    name: variable.name,
    lowerBound: getParsed(parsedByPath, ["state", "variables", index, "lowerBoundExpression"]),
    upperBound: getParsed(parsedByPath, ["state", "variables", index, "upperBoundExpression"])
  }));

  const parsedBaseCases = builderState.baseCases.map((baseCase, index) => ({
    id: baseCase.id,
    condition: getParsed(parsedByPath, ["baseCases", index, "conditionExpression"]),
    value: getParsed(parsedByPath, ["baseCases", index, "valueExpression"])
  }));

  const parsedTransitions = builderState.transitions.map((transition, index) => ({
    id: transition.id,
    condition:
      transition.conditionExpression === null
        ? null
        : getParsed(parsedByPath, ["transitions", index, "conditionExpression"]),
    value: getParsed(parsedByPath, ["transitions", index, "valueExpression"])
  }));

  return Object.freeze({
    builderState,
    parsedConstants: Object.freeze(parsedConstants),
    parsedStateVariables: Object.freeze(parsedStateVariables),
    parsedBaseCaseConditions: Object.freeze(parsedBaseCases.map((baseCase) => baseCase.condition)),
    parsedBaseCaseExpressions: Object.freeze(parsedBaseCases.map((baseCase) => baseCase.value)),
    parsedBaseCases: Object.freeze(parsedBaseCases),
    parsedTransitionConditions: Object.freeze(
      parsedTransitions.map((transition) => transition.condition)
    ),
    parsedTransitionExpressions: Object.freeze(
      parsedTransitions.map((transition) => transition.value)
    ),
    parsedTransitions: Object.freeze(parsedTransitions),
    parsedInitialValueExpression: getParsed(parsedByPath, ["initialValueExpression"]),
    parsedRootState: getParsed(parsedByPath, ["rootStateExpression"]),
    parsedAnswerExpression: getParsed(parsedByPath, ["answerExpression"])
  });
}

function getParsed(
  parsedByPath: ReadonlyMap<string, ParsedExpression>,
  path: readonly (string | number)[]
): ParsedExpression {
  const parsed = parsedByPath.get(pathKey(path));
  if (parsed === undefined) {
    throw new Error(`Missing parsed expression at ${path.join(".")}.`);
  }
  return parsed;
}

function pathKey(path: readonly (string | number)[]): string {
  return JSON.stringify(path);
}

function deepFreeze<T extends MathNode>(node: T): T {
  const seen = new WeakSet<object>();

  function freezeValue(value: unknown): void {
    if (value === null || typeof value !== "object" || seen.has(value)) {
      return;
    }

    seen.add(value);
    for (const key of Reflect.ownKeys(value)) {
      freezeValue((value as Record<PropertyKey, unknown>)[key]);
    }
    Object.freeze(value);
  }

  freezeValue(node);
  return node;
}
